from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework import status, generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import api_view, permission_classes
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import rest_framework.parsers
from django_ratelimit.decorators import ratelimit
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.http import JsonResponse
from django.db.models import Q, Count
from typing import Dict
import re
import bcrypt
import logging
import json
import hashlib
from copy import deepcopy
from .models import Startup, StartupTag, Position, Application, Notification, Favorite, Interest, Team
from .messaging_models import Conversation, Message, UserProfile, FileUpload
from .serializers import (
	UserRegistrationSerializer, UserLoginSerializer, UserSerializer, 
	StartupTagSerializer, PositionSerializer, StartupListSerializer, StartupDetailSerializer, StartupCreateSerializer, 
	ApplicationSerializer, ApplicationCreateSerializer, UserStartupSerializer,
	SearchResultSerializer, NotificationSerializer, FavoriteSerializer, InterestSerializer,
	MessageSerializer, ConversationSerializer, ConversationCreateSerializer, MessageCreateSerializer,
	UserProfileSerializer, UserProfileUpdateSerializer, FileUploadSerializer, FileUploadCreateSerializer,
	UserOnboardingPreferencesSerializer, UserInteractionSerializer, StartupInteractionStatusSerializer,
	AdminStartupSerializer, AdminUserSerializer
)
from .services.cache_service import RecommendationCacheService
from .services.presence_service import PresenceService

User = get_user_model()

# Cache key helper for auth tokens
_AUTH_TOKEN_TTL = 86400  # 24 hours — matches session lifetime


def _make_params_fingerprint(params: Dict[str, str]) -> str:
	normalized = json.dumps(
		{k: str(v) for k, v in sorted(params.items())},
		separators=(',', ':')
	)
	return hashlib.sha1(normalized.encode('utf-8')).hexdigest()[:12]


def _build_cache_use_case(base_use_case: str, params: Dict[str, str]) -> str:
	if not params:
		return base_use_case
	return f"{base_use_case}:{_make_params_fingerprint(params)}"


def _invalidate_user_cache(user_id: str, startup_id: str, interaction_type: str) -> None:
	RecommendationCacheService.invalidate_user_recommendations(str(user_id))
	RecommendationCacheService.record_interaction_indicator(str(user_id), str(startup_id), interaction_type)
	RecommendationCacheService.record_startup_indicator(str(startup_id), f"user:{user_id}:{interaction_type}")


# Helper function to get authenticated user from session or token
def get_session_user(request):
	"""Get authenticated user from session or auth token.

	Lookup priority:
	  1. Redis/cache O(1) lookup by auth_token header  ← fast path (production)
	  2. Fallback: Django session table scan            ← backwards compat only
	  3. Django auth middleware                          ← cookie-based sessions
	  4. Session data direct read                        ← last resort
	"""
	print(f"🔍 get_session_user called for path: {getattr(request, 'path', 'unknown')}")
	print(f"🔍 Request headers: Authorization={request.META.get('HTTP_AUTHORIZATION', 'None')}, Cookie={request.META.get('HTTP_COOKIE', 'None')}")

	# ── Fast path: Redis / cache lookup (O(1), replaces table scan) ──────────
	auth_header = request.META.get('HTTP_AUTHORIZATION')
	if auth_header and auth_header.startswith('Bearer '):
		auth_token = auth_header.split(' ')[1]
		print(f"🔑 Found auth token in header: {auth_token[:10]}...")

		# Primary: direct cache lookup — O(1), ~0.1 ms
		cached_user_id = cache.get(f"auth_token:{auth_token}")
		if cached_user_id:
			try:
				user = User.objects.get(id=cached_user_id, is_active=True)
				print(f"✅ Found user from cache (fast path): {user.username}")
				return user
			except (User.DoesNotExist, ValueError):
				# Token in cache but user gone — clean up stale entry
				cache.delete(f"auth_token:{auth_token}")
				print(f"❌ Stale auth_token in cache — deleted")

		# Fallback: session table scan for tokens issued before Redis was active.
		# On first match, backfills cache so subsequent requests use the fast path.
		# This fallback can be removed once all pre-Redis sessions expire (24h).
		print(f"⚠️ Cache miss — falling back to session table scan")
		from django.contrib.sessions.models import Session
		for session in Session.objects.all():
			try:
				session_data = session.get_decoded()
				if session_data.get('auth_token') == auth_token and 'user_id' in session_data:
					user_id = session_data['user_id']
					user = User.objects.get(id=user_id, is_active=True)
					# Backfill cache so next request skips the table scan
					cache.set(f"auth_token:{auth_token}", str(user_id), timeout=_AUTH_TOKEN_TTL)
					print(f"✅ Found user via session scan (backfilled cache): {user.username}")
					return user
			except (User.DoesNotExist, ValueError, KeyError, TypeError):
				continue

		print(f"❌ Invalid or expired auth token")

	# ── Django auth middleware (cookie-based sessions) ─────────────────────────
	if hasattr(request, 'user') and request.user.is_authenticated and hasattr(request.user, 'id'):
		print(f"✅ Found authenticated user via Django auth: {request.user.username}")
		return request.user

	# ── Session data direct read (last resort) ─────────────────────────────────
	if hasattr(request, 'session'):
		print(f"📝 Session key: {request.session.session_key}")
		print(f"📝 Session data: {dict(request.session)}")
		if request.session.get('is_authenticated') and 'user_id' in request.session:
			try:
				user_id = request.session['user_id']
				user = User.objects.get(id=user_id, is_active=True)
				print(f"✅ Found user from session data: {user.username}")
				return user
			except (User.DoesNotExist, ValueError) as e:
				print(f"❌ Error getting user from session: {e}")
		else:
			print(f"❌ Session missing authentication data: is_authenticated={request.session.get('is_authenticated')}, has_user_id={'user_id' in request.session}")
	else:
		print(f"❌ No session available on request")

	return None


# Home route
@api_view(['GET'])
@permission_classes([AllowAny])
def home(request):
	"""Home endpoint to test API is working"""
	return Response({
		"message": "Welcome to Startup Sales & Purchase Platform API",
		"version": "1.0.0",
		"status": "active",
		"endpoints": {
			"authentication": [
				"POST /signup",
				"POST /auth/login",
				"POST /auth/refresh",
				"POST /auth/forget-password",
				"POST /auth/verify",
				"POST /auth/logout"
			],
			"startups": [
				"POST /api/startups",
				"GET /api/startups/:id",
				"GET /api/marketplace",
				"GET /api/collaborations"
			],
			"applications": [
				"POST /api/collaborations/:id/apply",
				"GET /api/users/applications"
			],
			"user": [
				"GET /api/users/profile",
				"GET /api/users/startups"
			],
			"other": [
				"GET /api/stats",
				"GET /api/search"
			]
		}
	})


# Authentication Views

@method_decorator(csrf_exempt, name='dispatch')
class CheckUsernameView(generics.GenericAPIView):
	"""Lightweight endpoint to check username availability before signup."""
	permission_classes = [AllowAny]

	def get(self, request, *args, **kwargs):
		username = request.query_params.get('username', '').strip()
		if not username:
			return Response({'available': False, 'error': 'Username is required.'}, status=400)

		import re
		if not re.match(r'^[a-zA-Z0-9@.+\-_]+$', username):
			return Response({
				'available': False,
				'error': 'Username can only contain letters, numbers, and @/./+/-/_ characters.'
			}, status=200)

		exists = User.objects.filter(username__iexact=username).exists()
		if exists:
			return Response({
				'available': False,
				'error': 'This username is already taken. Please choose a different one.'
			}, status=200)

		return Response({'available': True}, status=200)


@method_decorator(csrf_exempt, name='dispatch')
class CheckEmailView(generics.GenericAPIView):
	"""Lightweight endpoint to check email availability before signup."""
	permission_classes = [AllowAny]

	def get(self, request, *args, **kwargs):
		email = request.query_params.get('email', '').strip().lower()
		if not email:
			return Response({'available': False, 'error': 'Email is required.'}, status=400)

		# Simple email regex check
		import re
		if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
			return Response({
				'available': False,
				'error': 'Please enter a valid email address.'
			}, status=200)

		exists = User.objects.filter(email__iexact=email).exists()
		if exists:
			return Response({
				'available': False,
				'error': 'This email is already registered. Please sign in instead.'
			}, status=200)

		return Response({'available': True}, status=200)


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST'), name='post')
@method_decorator(csrf_exempt, name='dispatch')
class GoogleVerifyView(generics.GenericAPIView):
	"""Verify Google ID token and return user info for pre-filling"""
	permission_classes = [AllowAny]

	def post(self, request):
		token = request.data.get('token')
		if not token:
			return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

		try:
			# Verify the Access Token by calling Google's tokeninfo endpoint
			import requests
			verify_url = f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={token}"
			response = requests.get(verify_url)
			
			if response.status_code != 200:
				return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)

			idinfo = response.json()

			# Extract user info
			email = idinfo.get('email')
			name = idinfo.get('name')
			
			if not email:
				return Response({'error': 'Email not found in token'}, status=status.HTTP_400_BAD_REQUEST)

			# Check if user already exists
			user = User.objects.filter(email=email).first()
			
			if user:
				# CASE 1: USER EXISTS -> Log them in directly
				print(f"✅ Existing Google user found: {user.email}")
				
				# Ensure session exists
				if not request.session.session_key:
					request.session.create()
				
				# Use Django's login to create session
				from django.contrib.auth import login
				login(request, user, backend='api.backends.BcryptAuthBackend')
				
				# Store user data in session
				request.session['user_id'] = str(user.id)
				request.session['user_email'] = user.email
				request.session['user_role'] = user.role
				request.session['is_authenticated'] = True
				
				# Create auth token for frontend
				import hashlib
				import time
				auth_token = hashlib.sha256(f"{user.id}{user.email}{time.time()}".encode()).hexdigest()[:32]
				request.session['auth_token'] = auth_token
				request.session.save()
				# Store token in Redis for O(1) lookup on subsequent requests
				cache.set(f"auth_token:{auth_token}", str(user.id), timeout=_AUTH_TOKEN_TTL)

				# Check onboarding status
				from .recommendation_models import UserOnboardingPreferences
				onboarding_prefs, _ = UserOnboardingPreferences.objects.get_or_create(user=user)

				return Response({
					'is_existing_user': True,
					'auth_token': auth_token,
					'user': {
						"id": str(user.id),
						"username": user.username,
						"email": user.email,
						"role": user.role,
						"onboarding_completed": onboarding_prefs.onboarding_completed,
						"emailVerified": user.email_verified,
					}
				}, status=status.HTTP_200_OK)
			
			else:
				# CASE 2: NEW USER -> Proceed to pre-fill Complete Profile
				print(f"🆕 New Google user: {email}")
				return Response({
					'is_existing_user': False,
					'email': email,
					'full_name': name
				}, status=status.HTTP_200_OK)

		except Exception as e:
			return Response({'error': f'Verification failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SignupView(generics.CreateAPIView):
	"""User registration endpoint"""
	queryset = User.objects.all()
	serializer_class = UserRegistrationSerializer
	permission_classes = [AllowAny]
	
	def create(self, request, *args, **kwargs):
		print(f"\n{'='*80}")
		print(f"📝 SIGNUP REQUEST RECEIVED")
		print(f"{'='*80}")
		print(f"📊 Request data: {request.data}")
		print(f"📋 Request method: {request.method}")
		print(f"🔍 Content-Type: {request.content_type}")
		
		serializer = self.get_serializer(data=request.data)
		print(f"🔍 Serializer validation starting...")
		print(f"📋 Serializer fields: {serializer.fields.keys()}")
		
		if serializer.is_valid():
			print(f"✅ Serializer validation passed")
			print(f"✅ Validated data: {serializer.validated_data}")
			try:
				user = serializer.save()
				
				# Auto-login after successful signup (like login flow)
				print(f"\n🔐=== SIGNUP AUTO-LOGIN ===")
				print(f"Auto-login user after signup: {user.username} (ID: {user.id})")
				
				# Ensure session exists and is saved
				if not request.session.session_key:
					print(f"🔑 Creating new session key")
					request.session.create()
				print(f"🔑 Session key: {request.session.session_key}")
				
				# Use Django's login to create session
				from django.contrib.auth import login
				print(f"🔑 Calling Django login() for user")
				login(request, user, backend='api.backends.BcryptAuthBackend')
				print(f"🔑 Django login completed. User authenticated: {request.user.is_authenticated}")
				
				# Store user ID in session for easy access
				request.session['user_id'] = str(user.id)
				request.session['user_email'] = user.email
				request.session['user_role'] = user.role
				request.session['is_authenticated'] = True
				print(f"📝 Session data stored: {dict(request.session)}")
				
				# Force session save
				request.session.save()
				print(f"💾 Session saved. Final session key: {request.session.session_key}")
				
				# Create a simple auth token for the frontend to use (same as login)
				import hashlib
				import time
				auth_token = hashlib.sha256(f"{user.id}{user.email}{time.time()}".encode()).hexdigest()[:32]
				
				# Store the auth token in session for validation
				request.session['auth_token'] = auth_token
				request.session.save()
				# Store token in Redis for O(1) lookup on subsequent requests
				cache.set(f"auth_token:{auth_token}", str(user.id), timeout=_AUTH_TOKEN_TTL)
				print(f"🔑 Auth token created and stored: {auth_token[:10]}...")
				
				response_data = {
					"message": "Account created successfully",
					"auth_token": auth_token,  # Send token to frontend like login does
					"user": {
						"id": str(user.id),
						"username": user.username,
						"email": user.email,
						"role": user.role,
						"onboarding_completed": False,
						"emailVerified": True,  # Simplified - no email verification
					},
				}
				
				response = Response(response_data, status=status.HTTP_201_CREATED)
				
				# Set session cookie (same as login flow)
				if request.session.session_key:
					response['X-Session-ID'] = request.session.session_key
					response.set_cookie(
						key='sessionid',
						value=request.session.session_key,
						max_age=86400,
						httponly=False,
						samesite=None,
						secure=False,
						domain=None
					)
					print(f"🍪 Session cookie + auth token set for signup")
				print(f"🎉 Signup with auto-login successful!")
				print("🔐=== END SIGNUP AUTO-LOGIN ===\n")
				
				return response
			except Exception as e:
				if "User already exists" in str(e):
					return Response(
						{"error": 1062, "message": "User already exists"},
						status=status.HTTP_409_CONFLICT
					)
				return Response(
					{"message": "Internal server error"},
					status=status.HTTP_500_INTERNAL_SERVER_ERROR
				)
		
		# Handle password validation errors
		if 'password' in serializer.errors:
			print(f"❌ Password validation error: {serializer.errors['password']}")
			return Response(
				{"message": "Password must be greater than 8 characters"},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		print(f"❌ Serializer validation FAILED")
		print(f"📋 All validation errors: {serializer.errors}")
		print(f"📋 Error details:")
		for field, errors in serializer.errors.items():
			print(f"  - {field}: {errors}")
		print(f"{'='*80}\n")
		
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(ratelimit(key='ip', rate='10/m', method='POST'), name='post')
@method_decorator(csrf_exempt, name='dispatch')
class LoginView(generics.GenericAPIView):
	"""User login endpoint with session authentication"""
	serializer_class = UserLoginSerializer
	permission_classes = [AllowAny]
	
	def post(self, request):
		print("\n🔐=== LOGIN DEBUG ===")
		print(f"Login request from: {request.META.get('REMOTE_ADDR')}")
		print(f"Request cookies: {dict(request.COOKIES)}")
		print(f"Session before login: {request.session.session_key}")
		
		serializer = self.get_serializer(data=request.data)
		if serializer.is_valid():
			email = serializer.validated_data['email']
			password = serializer.validated_data['password']
			
			try:
				user = User.objects.get(email=email, is_active=True)
				print(f"Found user: {user.username} (ID: {user.id})")
				
				# Verify password (support bcrypt + Django hashers)
				password_match = False
				stored_password = user.password or ""
				try:
					if stored_password.startswith('$2b$') or stored_password.startswith('$2a$'):
						print(f"🔒 Detected bcrypt hashed password")
						password_match = bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8'))
					else:
						print(f"🔄 Using Django password hasher for verification")
						password_match = user.check_password(password)
				except ValueError as e:
					print(f"⚠️ Password hash format not supported by bcrypt ({e}); falling back to Django hasher")
					password_match = user.check_password(password)
				except Exception as e:
					print(f"❌ Password verification error: {e}")
					password_match = False
				
				if password_match:
					print(f"✅ Password verified for user: {user.username}")
					
					# Ensure session exists and is saved
					if not request.session.session_key:
						print(f"🔑 Creating new session key")
						request.session.create()
					print(f"🔑 Session key: {request.session.session_key}")
					
					# Use Django's login to create session
					from django.contrib.auth import login
					print(f"🔑 Calling Django login() for user")
					login(request, user, backend='api.backends.BcryptAuthBackend')
					print(f"🔑 Django login completed. User authenticated: {request.user.is_authenticated}")
					
					# Store user ID in session for easy access
					request.session['user_id'] = str(user.id)
					request.session['user_email'] = user.email
					request.session['user_role'] = user.role
					request.session['is_authenticated'] = True
					print(f"📝 Session data stored: {dict(request.session)}")
					
					# Force session save
					request.session.save()
					print(f"💾 Session saved. Final session key: {request.session.session_key}")
					
					# Create a simple auth token for the frontend to use
					import hashlib
					import time
					auth_token = hashlib.sha256(f"{user.id}{user.email}{time.time()}".encode()).hexdigest()[:32]
					
					# Store the auth token in session for validation
					request.session['auth_token'] = auth_token
					request.session.save()
					# Store token in Redis for O(1) lookup on subsequent requests
					cache.set(f"auth_token:{auth_token}", str(user.id), timeout=_AUTH_TOKEN_TTL)
					
					# Check onboarding status
					from .recommendation_models import UserOnboardingPreferences
					onboarding_prefs, _ = UserOnboardingPreferences.objects.get_or_create(user=user)
					
					response_data = {
						"message": "Login successful",
						"auth_token": auth_token,  # Send token to frontend
						"user": {
							"id": str(user.id),
							"username": user.username,
							"email": user.email,
							"role": user.role,
							"onboarding_completed": onboarding_prefs.onboarding_completed,
							"emailVerified": user.email_verified,
							"is_staff": user.is_staff,
							"is_superuser": user.is_superuser,
						}
					}
					
					response = Response(response_data, status=status.HTTP_200_OK)
					
					# Still set session cookie as backup, but rely on token
					if request.session.session_key:
						response['X-Session-ID'] = request.session.session_key
						response.set_cookie(
							key='sessionid',
							value=request.session.session_key,
							max_age=86400,
							httponly=False,
							samesite=None,
							secure=False,
							domain=None
						)
						print(f"🍪 Session cookie + auth token set: {auth_token[:10]}...")
					print(f"🎉 Login successful! Returning response with session cookie")
					print("🔐=== END LOGIN DEBUG ===\n")
					return response
				else:
					print(f"❌ Password verification failed for user: {user.username}")
					return Response(
						{"error": "Wrong credentials"},
						status=status.HTTP_401_UNAUTHORIZED
					)
			except User.DoesNotExist:
				return Response(
					{"error": "Wrong credentials"},
					status=status.HTTP_401_UNAUTHORIZED
				)
		
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class VerifyEmailView(generics.GenericAPIView):
	"""Verify email endpoint (simplified - no actual verification)"""
	permission_classes = [AllowAny]
	
	def post(self, request):
		# Simplified - just return success
		return Response({
			"success": True,
			"message": "Email verified successfully"
		}, status=status.HTTP_200_OK)


@method_decorator(ratelimit(key='ip', rate='3/m', method='POST'), name='post')
@method_decorator(csrf_exempt, name='dispatch')
class SendVerificationCodeView(generics.GenericAPIView):
	"""Send verification code endpoint (simplified)"""
	permission_classes = [AllowAny]
	
	def post(self, request):
		# Simplified - just return success
		return Response({
			"success": True,
			"message": "Verification code sent to your email"
		}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='3/m', method='POST')
def forget_password(request):
	"""Password reset endpoint (placeholder)"""
	# This is a placeholder - implement actual password reset logic
	return Response(
		{"message": "Password reset email sent"},
		status=status.HTTP_200_OK
	)


@method_decorator(csrf_exempt, name='dispatch')
class RefreshTokenView(generics.GenericAPIView):
	"""Refresh token endpoint (simplified - no tokens)"""
	permission_classes = [AllowAny]
	
	def post(self, request):
		# Simplified - just return success message
		return Response({
			"message": "No token refresh needed"
		}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def logout(request):
	"""Logout endpoint with session cleanup and cache token invalidation"""
	try:
		# Invalidate auth token from Redis/cache before clearing session
		if hasattr(request, 'session'):
			auth_token = request.session.get('auth_token')
			if auth_token:
				cache.delete(f"auth_token:{auth_token}")
				print(f"🗑️ Auth token invalidated in cache on logout")

		# Use Django's logout to clear session
		from django.contrib.auth import logout as django_logout
		django_logout(request)

		# Clear remaining session data
		if hasattr(request, 'session'):
			request.session.flush()

		return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
	except Exception as e:
		return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)


# Startup Management Views
@method_decorator(csrf_exempt, name='dispatch')
class StartupCreateView(generics.CreateAPIView):
    """Create startup listing"""
    serializer_class = StartupCreateSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        # Get authenticated user
        user = get_session_user(request)
        if not user:
            return Response(
                {"error": "Authentication required", "message": "Please login to create a startup"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        print(f"\n🚀=== STARTUP CREATION ===")
        print(f"👤 Authenticated user: {user.username} (ID: {user.id})")
        print(f"📊 Request data keys: {list(request.data.keys())}")
        print(f"📋 Full request data: {request.data}")
        
        # Validate serializer
        serializer = self.get_serializer(data=request.data)
        print(f"🔍 Validating serializer...")
        
        if serializer.is_valid():
            print(f"✅ Serializer validation passed")
            return super().create(request, *args, **kwargs)
        else:
            print(f"❌ Serializer validation FAILED")
            print(f"📋 Validation errors: {serializer.errors}")
            for field, errors in serializer.errors.items():
                print(f"  - {field}: {errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        # Get user again to ensure we have it
        user = get_session_user(self.request)
        if not user:
            raise PermissionDenied("Authentication required")
        
        print(f"💾 Creating startup with owner: {user.username}")
        
        # Save startup — new submissions start as under_verification
        startup = serializer.save(owner=user, verification_status='under_verification')
        
        print(f"✅ Startup created: {startup.title} (ID: {startup.id})")
        
        # Add default tags based on type
        if startup.type == 'marketplace':
            StartupTag.objects.create(startup=startup, tag="Fund Raising")
            print(f"🏷️ Added 'Fund Raising' tag")
        else:
            StartupTag.objects.create(startup=startup, tag="Open to Collaborate")
            print(f"🏷️ Added 'Open to Collaborate' tag")
        
        print(f"🚀=== END STARTUP CREATION ===\n")


class MarketplaceListView(generics.ListAPIView):
    """Get all marketplace listings"""
    serializer_class = StartupListSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = Startup.objects.filter(
            type='marketplace', status='active', verification_status='verified'
        )
        
        # Apply filters
        sort_by = self.request.query_params.get('sortBy', 'date')
        order = self.request.query_params.get('order', 'desc')
        startup_type = self.request.query_params.get('type')
        category = self.request.query_params.get('category')
        limit = self.request.query_params.get('limit')
        
        if startup_type:
            queryset = queryset.filter(category=startup_type)
        if category:
            queryset = queryset.filter(category=category)
        
        # Simple ordering
        if sort_by == 'date':
            order_field = 'created_at'
        elif sort_by == 'price':
            order_field = 'asking_price'
        else:
            order_field = 'created_at'
        
        if order == 'desc':
            order_field = f'-{order_field}'
        
        queryset = queryset.order_by(order_field)
        
        if limit:
            try:
                limit = int(limit)
                queryset = queryset[:limit]
            except ValueError:
                pass
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "results": serializer.data,
            "count": queryset.count()
        })


class CollaborationListView(generics.ListAPIView):
	"""Get collaboration listings"""
	serializer_class = StartupListSerializer
	permission_classes = [AllowAny]
	
	def get_queryset(self):
		queryset = Startup.objects.filter(
			type='collaboration', status='active', verification_status='verified'
		)
		
		# Apply filters
		sort_by = self.request.query_params.get('sortBy', 'date')
		order = self.request.query_params.get('order', 'desc')
		phase = self.request.query_params.get('phase')
		earnthrough = self.request.query_params.get('earnthrough')
		
		if phase:
			queryset = queryset.filter(phase=phase)
		if earnthrough:
			queryset = queryset.filter(earn_through=earnthrough)
		
		# Simple ordering
		if sort_by == 'date':
			order_field = 'created_at'
		elif sort_by == 'team':
			order_field = 'team_size'
		else:
			order_field = 'created_at'
		
		if order == 'desc':
			order_field = f'-{order_field}'
		
		return queryset.order_by(order_field)


class StartupDetailView(generics.RetrieveDestroyAPIView):
	"""Get or delete startup details"""
	queryset = Startup.objects.all()
	serializer_class = StartupDetailSerializer
	permission_classes = [AllowAny]
	
	def retrieve(self, request, *args, **kwargs):
		try:
			instance = self.get_object()
		except Exception as e:
			print(f"❌ Error getting startup object: {type(e).__name__}: {str(e)}")
			import traceback
			print(f"❌ Traceback:\n{traceback.format_exc()}")
			return Response(
				{"error": "Startup not found", "detail": str(e)},
				status=status.HTTP_404_NOT_FOUND
			)
		
		# Block public access to non-verified startups.
		# Owner can still view their own startup (to see its status).
		# Admin (is_staff/is_superuser) can see all startups.
		request_user = get_session_user(request)
		is_owner = request_user and instance.owner == request_user
		is_admin = request_user and (request_user.is_staff or request_user.is_superuser)
		if not is_owner and not is_admin and instance.verification_status != 'verified':
			return Response(
				{"error": "Startup not found"},
				status=status.HTTP_404_NOT_FOUND
			)

		# Increment view count (for backward compatibility)
		try:
			instance.views += 1
			instance.save(update_fields=['views'])
		except Exception as e:
			print(f"⚠️ Warning: Failed to increment view count: {str(e)}")
		
		# Track user interaction if user is logged in
		user = get_session_user(request)
		if user:
			from .services.interaction_service import InteractionService
			from django.db import IntegrityError
			try:
				# Get recommendation context from query params (frontend can pass this)
				recommendation_session_id = request.query_params.get('recommendation_session_id')
				recommendation_rank = request.query_params.get('recommendation_rank')
				
				# Build metadata and recommendation context
				metadata, recommendation_context = InteractionService.build_interaction_metadata(
					recommendation_session_id=recommendation_session_id,
					recommendation_rank=int(recommendation_rank) if recommendation_rank else None,
					user_id=str(user.id),
					source='view'
				)
				
				# Create view interaction with recommendation context
				InteractionService.create_interaction(
					user=user,
					startup=instance,
					interaction_type='view',
					metadata=metadata,
					recommendation_context=recommendation_context
				)
			except IntegrityError:
				# Race condition - interaction already exists, ignore
				pass
			except Exception as e:
				print(f"⚠️ Warning: Failed to track user interaction: {str(e)}")
				import traceback
				print(traceback.format_exc())
		
		try:
			return super().retrieve(request, *args, **kwargs)
		except Exception as e:
			print(f"❌ Error serializing startup: {type(e).__name__}: {str(e)}")
			import traceback
			print(f"❌ Traceback:\n{traceback.format_exc()}")
			return Response(
				{"error": "Failed to load startup details", "detail": str(e)},
				status=status.HTTP_500_INTERNAL_SERVER_ERROR
			)
	
	def destroy(self, request, *args, **kwargs):
		"""Delete startup - only owner can delete"""
		print(f"\n{'='*80}")
		print(f"🗑️ DELETE STARTUP REQUEST RECEIVED")
		print(f"{'='*80}")
		
		user = get_session_user(request)
		print(f"👤 Authenticated user: {user.username if user else 'None'} (ID: {user.id if user else 'N/A'})")
		
		if not user:
			print("❌ Authentication failed - no user found")
			return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
		
		startup_id = kwargs.get('pk')
		print(f"🎯 Target startup ID: {startup_id}")
		
		try:
			instance = self.get_object()
			print(f"✅ Startup found: {instance.title}")
			print(f"👤 Startup owner: {instance.owner.username} (ID: {instance.owner.id})")
			print(f"🔒 Requesting user: {user.username} (ID: {user.id})")
			
			# Check if user is the owner
			if instance.owner != user:
				print(f"❌ Permission denied - user {user.id} is not owner {instance.owner.id}")
				return Response(
					{"error": "You don't have permission to delete this startup"}, 
					status=status.HTTP_403_FORBIDDEN
				)
			
			print(f"✅ Permission granted - user is the owner")
			print(f"🗑️ Deleting startup: {instance.title} (ID: {instance.id})")
			
			# Delete the startup
			instance.delete()
			
			print(f"✅ Startup deleted successfully from database")
			print(f"{'='*80}\n")
			
			return Response(
				{"message": "Startup deleted successfully"}, 
				status=status.HTTP_204_NO_CONTENT
			)
		except Startup.DoesNotExist:
			print(f"❌ Startup not found with ID: {startup_id}")
			return Response(
				{"error": "Startup not found"}, 
				status=status.HTTP_404_NOT_FOUND
			)
		except Exception as e:
			print(f"❌ Unexpected error during deletion: {str(e)}")
			print(f"Error type: {type(e).__name__}")
			import traceback
			traceback.print_exc()
			return Response(
				{"error": f"Failed to delete startup: {str(e)}"}, 
				status=status.HTTP_500_INTERNAL_SERVER_ERROR
			)


# Collaboration Views
class ApplyForCollaborationView(generics.CreateAPIView):
	"""Apply for collaboration"""
	serializer_class = ApplicationCreateSerializer
	permission_classes = [AllowAny]
	
	def create(self, request, *args, **kwargs):
		print(f"\n{'='*80}")
		print(f"📝 APPLICATION SUBMISSION REQUEST")
		print(f"{'='*80}")
		print(f"🔍 Request method: {request.method}")
		print(f"🔍 Request path: {request.path}")
		print(f"🔍 Request data: {request.data}")
		print(f"🔍 Request data type: {type(request.data)}")
		print(f"🔍 Request data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'N/A'}")
		
		user = get_session_user(request)
		if not user:
			print(f"❌ No authenticated user found")
			print(f"{'='*80}\n")
			return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
		
		print(f"✅ User: {user.username} (ID: {user.id})")
		
		startup_id = kwargs.get('pk')
		print(f"🔍 Startup ID: {startup_id}")
		
		try:
			startup = Startup.objects.get(id=startup_id)
			print(f"✅ Startup found: {startup.title}")
			
			serializer = self.get_serializer(data=request.data, context={'request': request, 'user': user})
			print(f"🔍 Serializer data: {serializer.initial_data}")
			print(f"🔍 Serializer is valid: {serializer.is_valid()}")
			
			if not serializer.is_valid():
				print(f"❌ Serializer validation errors:")
				print(f"   {serializer.errors}")
				print(f"{'='*80}\n")
				return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
			
			print(f"✅ Serializer is valid, creating application...")
			application = serializer.save()
			print(f"✅ Application created: {application.id}")
			
			# Notify startup owner of new application
			Notification.objects.create(
				user=startup.owner,
				type='new_application',
				title='New application received',
				message=f"{user.username} applied to {startup.title}",
				data={
					"startupId": str(startup.id),
					"applicationId": str(application.id),
					"positionId": str(application.position.id),
				}
			)
			print(f"✅ Notification created for startup owner")
			
			response_data = {
				"message": "Application submitted successfully",
				"application": {
					"id": str(application.id),
					"startupId": str(application.startup.id),
					"positionId": str(application.position.id),
					"applicantId": str(application.applicant.id),
					"status": application.status,
					"createdAt": application.created_at
				}
			}
			_invalidate_user_cache(user.id, startup.id, 'apply')
			print(f"✅ Sending success response")
			print(f"{'='*80}\n")
			return Response(response_data, status=status.HTTP_201_CREATED)
			
		except Startup.DoesNotExist:
			print(f"❌ Startup not found: {startup_id}")
			print(f"{'='*80}\n")
			return Response(
				{"error": "Startup not found"},
				status=status.HTTP_404_NOT_FOUND
			)
		except Exception as e:
			print(f"❌ Unexpected error: {type(e).__name__}: {str(e)}")
			import traceback
			print(f"❌ Traceback:\n{traceback.format_exc()}")
			print(f"{'='*80}\n")
			return Response(
				{"error": f"An error occurred: {str(e)}"},
				status=status.HTTP_500_INTERNAL_SERVER_ERROR
			)


class UserApplicationsView(generics.ListAPIView):
	"""Get user applications"""
	serializer_class = ApplicationSerializer
	permission_classes = [AllowAny]
	
	def get_queryset(self):
		user = get_session_user(self.request)
		if not user:
			return Application.objects.none()
		return Application.objects.filter(applicant=user)


# Entrepreneur Application Management
class StartupApplicationsView(generics.ListAPIView):
	"""List applications for a given startup (entrepreneur owner only)"""
	serializer_class = ApplicationSerializer
	permission_classes = [AllowAny]

	def get_queryset(self):
		startup_id = self.kwargs.get('pk')
		user = get_session_user(self.request)
		if not user:
			return Application.objects.none()
		# Only allow owner to see applications
		return Application.objects.filter(
			startup_id=startup_id,
			startup__owner=user,
		).select_related('startup', 'position', 'applicant')
	
	def list(self, request, *args, **kwargs):
		startup_id = self.kwargs.get('pk')
		user = get_session_user(self.request)
		if not user:
			return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
		
		try:
			startup = Startup.objects.get(id=startup_id, owner=user)
		except Startup.DoesNotExist:
			return Response({"detail": "Startup not found"}, status=status.HTTP_404_NOT_FOUND)
		
		applications = self.get_queryset()
		serializer = self.get_serializer(applications, many=True)
		
		return Response({
			"startup": {
				"id": str(startup.id),
				"title": startup.title,
				"description": startup.description,
				"category": startup.category,
				"type": startup.type
			},
			"applications": serializer.data
		})


class UserStartupsWithApplicationsView(generics.ListAPIView):
	"""List user's startups that have received applications, with application counts"""
	serializer_class = UserStartupSerializer
	permission_classes = [AllowAny]

	def get_queryset(self):
		user = get_session_user(self.request)
		if not user:
			return Startup.objects.none()
		# Return only startups that have at least one application, grouped by startup ID to avoid duplicates
		return Startup.objects.filter(
			owner=user,
			applications__isnull=False
		).distinct().annotate(
			applications_count=Count('applications')
		).order_by('-created_at')
	
	def list(self, request, *args, **kwargs):
		queryset = self.get_queryset()
		
		# Deduplicate by startup ID to ensure each startup appears only once
		seen_ids = set()
		unique_startups = []
		for startup in queryset:
			if startup.id not in seen_ids:
				unique_startups.append(startup)
				seen_ids.add(startup.id)
		
		serializer = self.get_serializer(unique_startups, many=True)
		
		# Add application counts to each startup
		startups_data = serializer.data
		for startup_data in startups_data:
			startup_id = startup_data['id']
			app_count = Application.objects.filter(startup_id=startup_id).count()
			has_approved = Application.objects.filter(startup_id=startup_id, status='approved').exists()
			team_exists = Team.objects.filter(startup_id=startup_id).exists()
			team_conv_exists = Conversation.objects.filter(team__startup_id=startup_id, is_active=True).exists()
			
			startup_data['applications_count'] = app_count
			startup_data['has_approved_applications'] = has_approved
			startup_data['team_exists'] = team_exists
			startup_data['team_conversation_exists'] = team_conv_exists
		
		return Response({
			"results": startups_data,
			"count": len(startups_data)
		})


class PositionApplicationsView(generics.ListAPIView):
	"""List applications for a specific position (position owner only)"""
	serializer_class = ApplicationSerializer
	permission_classes = [AllowAny]

	def get_queryset(self):
		position_id = self.kwargs.get('pk')
		user = get_session_user(self.request)
		if not user:
			return Application.objects.none()
		# Only allow position's startup owner to see applications
		return Application.objects.filter(
			position_id=position_id,
			position__startup__owner=user,
		).select_related('startup', 'position', 'applicant')
	
	def list(self, request, *args, **kwargs):
		position_id = self.kwargs.get('pk')
		try:
			position = Position.objects.get(id=position_id)
		except Position.DoesNotExist:
			return Response({"detail": "Position not found"}, status=status.HTTP_404_NOT_FOUND)
		
		applications = self.get_queryset()
		serializer = self.get_serializer(applications, many=True)
		
		return Response({
			"position": {
				"id": str(position.id),
				"title": position.title,
				"description": position.description,
				"requirements": position.requirements
			},
			"startup": {
				"id": str(position.startup.id),
				"title": position.startup.title
			},
			"applications": serializer.data
		})


class ApproveApplicationView(generics.GenericAPIView):
	"""Approve an application (startup owner only)"""
	serializer_class = ApplicationSerializer
	permission_classes = [AllowAny]
	queryset = Application.objects.all()

	def post(self, request, *args, **kwargs):
		"""Approve application (POST method)"""
		return self.update(request, *args, **kwargs)

	def update(self, request, *args, **kwargs):
		application = self.get_object()
		user = get_session_user(request)
		if not user or application.startup.owner != user:
			return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
		if Application.objects.filter(position=application.position, status='approved').exclude(id=application.id).exists():
			return Response(
				{"detail": "This position has already been filled. You cannot approve multiple applicants for the same position."},
				status=status.HTTP_400_BAD_REQUEST
			)

		application.status = 'approved'
		application.save(update_fields=['status'])
		
		# Notify applicant of status change
		Notification.objects.create(
			user=application.applicant,
			type='application_status',
			title='Application approved',
			message=f"Your application for {application.position.title} at {application.startup.title} was approved.",
			data={
				"startupId": str(application.startup.id),
				"applicationId": str(application.id),
				"positionId": str(application.position.id),
				"status": application.status,
			}
		)
		
		# Create or get conversation between entrepreneur and applicant
		conversation = None
		try:
			# Check if conversation already exists between these two users
			conversation = Conversation.objects.filter(
				participants=user,
				is_active=True
			).filter(participants=application.applicant).first()
			
			if not conversation:
				# Create new conversation
				conversation = Conversation.objects.create(
					title=f"{application.startup.title} - {application.position.title}"
				)
				conversation.participants.set([user.id, application.applicant.id])
			
			# Send default congratulatory message from entrepreneur
			default_message = (
				f"Congratulations! I'm pleased to inform you that your application for the "
				f"{application.position.title} position at {application.startup.title} has been approved. "
				f"I'd love to discuss the next steps and answer any questions you may have. "
				f"Let's schedule a time to chat!"
			)
			
			# Ensure no duplicate messages are created
			message_exists = Message.objects.filter(
				conversation=conversation,
				sender=user,
				content=default_message
			).exists()
			
			if not message_exists:
				Message.objects.create(
					conversation=conversation,
					sender=user,
					content=default_message,
					message_type='text'
				)
			
		except Exception as e:
			print(f"⚠️ Failed to create conversation/message for approved application: {e}")
			# Don't fail the approval if messaging setup fails
		
		serializer = self.get_serializer(application)
		response_data = serializer.data
		if conversation:
			response_data['conversation_id'] = str(conversation.id)
		
		return Response(response_data, status=status.HTTP_200_OK)


# UC5: Positions Management (Entrepreneur Only)
class AllPositionsView(generics.ListAPIView):
    """List all available positions across all startups (for job seekers)"""
    serializer_class = PositionSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        # Only show positions from active + verified startups to the public
        return Position.objects.filter(
            is_active=True,
            startup__status='active',
            startup__verification_status='verified'
        ).select_related('startup', 'startup__owner').order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Apply filters if provided
        category = request.query_params.get('category')
        field = request.query_params.get('field')
        phase = request.query_params.get('phase')
        team_size = request.query_params.get('team_size')
        search_query = request.query_params.get('q', request.query_params.get('query'))
        
        if category:
            queryset = queryset.filter(startup__category=category)
        if field:
            queryset = queryset.filter(startup__field__icontains=field)
        if phase:
            queryset = queryset.filter(startup__phase__icontains=phase)
        if team_size:
            queryset = queryset.filter(startup__team_size__icontains=team_size)
        if search_query:
            search_query = search_query.strip()
            terms = [term for term in re.split(r'\s+', search_query) if term]
            for term in terms:
                queryset = queryset.filter(
                    Q(title__icontains=term) |
                    Q(description__icontains=term) |
                    Q(requirements__icontains=term) |
                    Q(startup__title__icontains=term)
                )
        
        serializer = self.get_serializer(queryset, many=True)
        
        # Add startup info to each position
        for i, position_data in enumerate(serializer.data):
            position = queryset[i]
            position_data['startup'] = {
                'id': str(position.startup.id),
                'title': position.startup.title,
                'description': position.startup.description,
                'category': position.startup.category,
                'field': position.startup.field,
                'phase': position.startup.phase,
                'team_size': position.startup.team_size,
                'earn_through': position.startup.earn_through,
                'owner': {
                    'id': str(position.startup.owner.id),
                    'username': position.startup.owner.username,
                    'email': position.startup.owner.email
                }
            }
        
        return Response({
            "results": serializer.data,
            "count": queryset.count()
        })


class StartupPositionsView(generics.ListCreateAPIView):
    """List and create positions for a startup (owner only for create, public for list)"""
    serializer_class = PositionSerializer
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        startup_id = self.kwargs.get('pk')
        user = get_session_user(self.request)
        startup = Startup.objects.filter(id=startup_id).first()
        
        # For listing (GET): 
        # - Show all positions (active and closed) to startup owner
        # - Show only active positions to everyone else, but ONLY if the startup is verified
        if self.request.method == 'GET':
            if user and startup and startup.owner == user:
                # Owner sees all their positions regardless of verification
                return Position.objects.filter(startup_id=startup_id)
            else:
                # Public sees only active positions from verified startups
                if not startup or startup.verification_status != 'verified':
                    return Position.objects.none()
                return Position.objects.filter(startup_id=startup_id, is_active=True)
        else:
            # For creating (POST), only allow startup owner
            if not user:
                return Position.objects.none()  # Return empty queryset if not authenticated
            return Position.objects.filter(startup_id=startup_id, startup__owner=user)
    
    def list(self, request, *args, **kwargs):
        startup_id = self.kwargs.get('pk')
        try:
            startup = Startup.objects.get(id=startup_id)
        except Startup.DoesNotExist:
            return Response({"detail": "Startup not found"}, status=status.HTTP_404_NOT_FOUND)
        
        positions = self.get_queryset()
        serializer = self.get_serializer(positions, many=True)
        
        return Response({
            "startup": {
                "id": str(startup.id),
                "title": startup.title,
                "description": startup.description,
                "category": startup.category
            },
            "positions": serializer.data
        })

    def perform_create(self, serializer):
        startup_id = self.kwargs.get('pk')
        user = get_session_user(self.request)
        if not user:
            raise PermissionDenied("Authentication required")
        try:
            startup = Startup.objects.get(id=startup_id, owner=user)
        except Startup.DoesNotExist:
            raise PermissionDenied("Not authorized to modify this startup")
        
        # Only allow creating positions for Collaboration-type startups
        if startup.type != 'collaboration':
            raise PermissionDenied("Positions can only be created for Collaboration-type startups")
        
        serializer.save(startup=startup)


class PositionDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve/Update a position (owner only)"""
    serializer_class = PositionSerializer
    permission_classes = [AllowAny]
    queryset = Position.objects.select_related('startup')

    def update(self, request, *args, **kwargs):
        position = self.get_object()
        user = get_session_user(request)
        if not user or position.startup.owner != user:
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)


class ClosePositionView(generics.GenericAPIView):
    """Close/Delete a position"""
    serializer_class = PositionSerializer
    permission_classes = [AllowAny]
    queryset = Position.objects.select_related('startup')

    def post(self, request, *args, **kwargs):
        """Close position (set is_active=False)"""
        print(f"\n{'='*80}")
        print(f"🔒 CLOSE POSITION REQUEST")
        print(f"{'='*80}")
        
        position = self.get_object()
        user = get_session_user(request)
        
        print(f"📋 Position: {position.title} (ID: {position.id})")
        print(f"👤 User: {user.username if user else 'None'}")
        print(f"🏢 Startup owner: {position.startup.owner.username}")
        
        if not user or position.startup.owner != user:
            print(f"❌ Authorization failed")
            print(f"{'='*80}\n")
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        
        position.is_active = False
        position.save(update_fields=['is_active'])
        
        print(f"✅ Position closed successfully")
        print(f"{'='*80}\n")
        
        serializer = self.get_serializer(position)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def delete(self, request, *args, **kwargs):
        """Delete position and all related applications"""
        print(f"\n{'='*80}")
        print(f"🗑️ DELETE POSITION REQUEST")
        print(f"{'='*80}")
        
        position = self.get_object()
        user = get_session_user(request)
        
        print(f"📋 Position: {position.title} (ID: {position.id})")
        print(f"👤 User: {user.username if user else 'None'}")
        print(f"🏢 Startup owner: {position.startup.owner.username}")
        
        if not user or position.startup.owner != user:
            print(f"❌ Authorization failed")
            print(f"{'='*80}\n")
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get count of applications before deleting
        app_count = position.applications.count()
        print(f"📊 Position has {app_count} applications that will be deleted")
        
        # Django will automatically delete related applications due to CASCADE
        position.delete()
        
        print(f"✅ Position and {app_count} applications deleted successfully")
        print(f"{'='*80}\n")
        
        return Response(
            {"message": "Position deleted successfully"}, 
            status=status.HTTP_204_NO_CONTENT
        )


class OpenPositionView(generics.GenericAPIView):
    """Open a position (set is_active=True)"""
    serializer_class = PositionSerializer
    permission_classes = [AllowAny]
    queryset = Position.objects.select_related('startup')

    def post(self, request, *args, **kwargs):
        """Open position (set is_active=True)"""
        position = self.get_object()
        user = get_session_user(request)
        if not user or position.startup.owner != user:
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        position.is_active = True
        position.save(update_fields=['is_active'])
        serializer = self.get_serializer(position)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def update(self, request, *args, **kwargs):
        """Also support PATCH/PUT for backward compatibility"""
        return self.post(request, *args, **kwargs)

class DeclineApplicationView(generics.GenericAPIView):
	"""Decline an application (startup owner only)"""
	serializer_class = ApplicationSerializer
	permission_classes = [AllowAny]
	queryset = Application.objects.all()

	def post(self, request, *args, **kwargs):
		"""Decline application (POST method)"""
		return self.update(request, *args, **kwargs)

	def update(self, request, *args, **kwargs):
		application = self.get_object()
		user = get_session_user(request)
		if not user or application.startup.owner != user:
			return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
		application.status = 'rejected'
		application.save(update_fields=['status'])
		# Notify applicant of status change
		Notification.objects.create(
			user=application.applicant,
			type='application_status',
			title='Application rejected',
			message=f"Your application for {application.position.title} at {application.startup.title} was rejected.",
			data={
				"startupId": str(application.startup.id),
				"applicationId": str(application.id),
				"positionId": str(application.position.id),
				"status": application.status,
			}
		)
		serializer = self.get_serializer(application)
		return Response(serializer.data, status=status.HTTP_200_OK)


# UC6: Notifications
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
@csrf_exempt
def notification_list_view(request):
    """List current user's notifications and create new ones"""
    if request.method == 'GET':
        # List notifications for current user
        user = get_session_user(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        notifications = Notification.objects.filter(user=user).order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create notification for specific user
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Target user not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create notification directly without using serializer save
        try:
            notification = Notification.objects.create(
                user=target_user,
                type=request.data.get('type', 'general'),
                title=request.data.get('title', ''),
                message=request.data.get('message', ''),
                data=request.data.get('data', {})
            )
            
            # Return success response with notification data
            response_data = {
                'id': str(notification.id),
                'type': notification.type,
                'title': notification.title,
                'message': notification.message,
                'data': notification.data,
                'is_read': notification.is_read,
                'created_at': notification.created_at.isoformat()
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': f'Failed to create notification: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MarkNotificationReadView(generics.UpdateAPIView):
    """Mark a notification as read"""
    serializer_class = NotificationSerializer
    permission_classes = [AllowAny]
    queryset = Notification.objects.all()

    def update(self, request, *args, **kwargs):
        n = self.get_object()
        user = get_session_user(request)
        if not user or n.user != user:
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        n.is_read = True
        n.save(update_fields=['is_read'])
        serializer = self.get_serializer(n)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([AllowAny])
@csrf_exempt
def mark_all_notifications_read(request):
    user = get_session_user(request)
    if not user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
    count = Notification.objects.filter(user=user, is_read=False).update(is_read=True)
    return Response({"updated": count})


# UC7: Investor engagement
class UserFavoritesView(generics.ListAPIView):
    """List current user's saved startups"""
    serializer_class = FavoriteSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user = get_session_user(self.request)
        if not user:
            return Favorite.objects.none()
        queryset = Favorite.objects.filter(user=user).select_related('startup', 'startup__owner').order_by('-created_at')
        print(f"[UserFavoritesView] Queryset count for user {user.email}: {queryset.count()}")
        for fav in queryset:
            print(f"[UserFavoritesView] - Favorite ID: {fav.id}, Startup: {fav.startup.title} (ID: {fav.startup.id})")
        return queryset
    
    def list(self, request, *args, **kwargs):
        # Add debugging info
        user = get_session_user(request)
        print(f"🔍 UserFavoritesView: User {user} requesting favorites")
        print(f"🔍 User authenticated: {user is not None}")
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        response = super().list(request, *args, **kwargs)
        print(f"[UserFavoritesView] Response data type: {type(response.data)}")
        print(f"[UserFavoritesView] Response data keys: {response.data.keys() if isinstance(response.data, dict) else 'Not a dict'}")
        print(f"[UserFavoritesView] Response data: {response.data}")
        return response


class ToggleFavoriteView(generics.GenericAPIView):
    """POST to save favorite, DELETE to remove"""
    permission_classes = [AllowAny]
    serializer_class = FavoriteSerializer

    def post(self, request, *args, **kwargs):
        user = get_session_user(request)
        print(f"[ToggleFavoriteView POST] User: {user}")
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        startup_id = kwargs.get('pk')
        print(f"[ToggleFavoriteView POST] Startup ID: {startup_id}")
        try:
            startup = Startup.objects.get(id=startup_id)
        except Startup.DoesNotExist:
            print(f"[ToggleFavoriteView POST] Startup not found: {startup_id}")
            return Response({"detail": "Startup not found"}, status=status.HTTP_404_NOT_FOUND)
        fav, created = Favorite.objects.get_or_create(user=user, startup=startup)
        print(f"[ToggleFavoriteView POST] Favorite created: {created}, Favorite ID: {fav.id}")
        _invalidate_user_cache(user.id, startup.id, 'favorite')
        if created:
            return Response(self.get_serializer(fav).data, status=status.HTTP_201_CREATED)
        return Response(self.get_serializer(fav).data, status=status.HTTP_200_OK)

    def delete(self, request, *args, **kwargs):
        user = get_session_user(request)
        print(f"[ToggleFavoriteView DELETE] User: {user}")
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        startup_id = kwargs.get('pk')
        print(f"[ToggleFavoriteView DELETE] Startup ID: {startup_id}")
        deleted_count, _ = Favorite.objects.filter(user=user, startup_id=startup_id).delete()
        print(f"[ToggleFavoriteView DELETE] Deleted count: {deleted_count}")
        if deleted_count:
            _invalidate_user_cache(user.id, startup_id, 'unfavorite')
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserInterestsView(generics.ListAPIView):
    """List current user's expressed interests"""
    serializer_class = InterestSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user = get_session_user(self.request)
        if not user:
            return Interest.objects.none()
        return Interest.objects.filter(user=user).select_related('startup', 'startup__owner').order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        # Add debugging info
        user = get_session_user(request)
        print(f"🔍 UserInterestsView: User {user} requesting interests")
        print(f"🔍 User authenticated: {user is not None}")
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        return super().list(request, *args, **kwargs)


class StartupInterestsView(generics.ListAPIView):
    """List interests for a startup (owner only)"""
    serializer_class = InterestSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        startup_id = self.kwargs.get('pk')
        user = get_session_user(self.request)
        if not user:
            return Interest.objects.none()
        return Interest.objects.filter(startup_id=startup_id, startup__owner=user).select_related('startup', 'user')


class ConvertToMarketplaceView(generics.GenericAPIView):
    """Convert a Collaboration startup to Marketplace"""
    serializer_class = StartupDetailSerializer
    permission_classes = [AllowAny]
    queryset = Startup.objects.all()

    def post(self, request, *args, **kwargs):
        startup_id = self.kwargs.get('pk')
        user = get_session_user(request)
        
        if not user:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            startup = Startup.objects.get(id=startup_id, owner=user)
        except Startup.DoesNotExist:
            return Response({"detail": "Startup not found or not authorized"}, status=status.HTTP_404_NOT_FOUND)
        
        # Only allow conversion from Collaboration to Marketplace
        if startup.type != 'collaboration':
            return Response(
                {"detail": "Only Collaboration-type startups can be converted to Marketplace"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update startup type and marketplace fields
        startup.type = 'marketplace'
        
        # Update fields from request data (only financial fields - others already exist from collaboration)
        marketplace_fields = [
            'revenue', 'profit', 'asking_price',
            'ttm_revenue', 'ttm_profit',
            'last_month_revenue', 'last_month_profit'
        ]
        
        # Validate all required fields are present
        missing_fields = [field for field in marketplace_fields if not request.data.get(field)]
        if missing_fields:
            return Response(
                {"detail": f"Missing required fields: {', '.join(missing_fields)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        for field in marketplace_fields:
            setattr(startup, field, request.data[field])
        
        startup.save()
        
        serializer = self.get_serializer(startup)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExpressInterestView(generics.CreateAPIView):
    """Express interest in a startup with optional message"""
    serializer_class = InterestSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        user = get_session_user(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        startup_id = kwargs.get('pk')
        message = request.data.get('message', '')
        try:
            startup = Startup.objects.get(id=startup_id)
        except Startup.DoesNotExist:
            return Response({"detail": "Startup not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if interest already exists
        try:
            interest = Interest.objects.get(user=user, startup=startup)
            # Update existing interest
            if message:
                interest.message = message
                interest.save(update_fields=['message'])
            created = False
        except Interest.DoesNotExist:
            # Create new interest
            interest = Interest.objects.create(
                user=user, 
                startup=startup, 
                message=message
            )
            created = True
            
            # Notify owner only for new interests
            Notification.objects.create(
                user=startup.owner,
                type='new_application',
                title='New investor interest',
                message=f"{user.username} is interested in {startup.title}",
                data={"startupId": str(startup.id), "interestId": str(interest.id)},
            )
        
        # === Messaging: ensure DB-based conversation between investor and owner ===
        try:
            # Find existing conversation between the two, or create one
            conversation = Conversation.objects.filter(
                participants=user,
                is_active=True,
            ).filter(participants=startup.owner).first()
            if not conversation:
                conversation = Conversation.objects.create(title=f"{startup.title}")
                conversation.participants.set([user.id, startup.owner.id])

            # If a message was provided in the interest, persist it as the first message
            if message and message.strip():
                Message.objects.create(
                    conversation=conversation,
                    sender=user,
                    content=message.strip(),
                    message_type='text'
                )
        except Exception as e:
            # Don't fail the interest API if messaging setup fails; log to console
            print(f"⚠️ Messaging setup failed for interest: {e}")

        _invalidate_user_cache(user.id, startup.id, 'interest')
        serializer = self.get_serializer(interest)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# Cookie test endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def cookie_test(request):
	"""Test cookie handling"""
	print(f"\n🍪=== COOKIE TEST DEBUG ===")
	print(f"Request cookies: {dict(request.COOKIES)}")
	print(f"Session key: {getattr(request.session, 'session_key', 'None')}")
	print(f"Origin: {request.META.get('HTTP_ORIGIN', 'None')}")
	print(f"Referer: {request.META.get('HTTP_REFERER', 'None')}")
	print(f"User-Agent: {request.META.get('HTTP_USER_AGENT', 'None')[:50]}...")
	print(f"🍪=== END COOKIE TEST DEBUG ===\n")
	
	return Response({
		"cookies_received": dict(request.COOKIES),
		"session_key": getattr(request.session, 'session_key', None),
		"origin": request.META.get('HTTP_ORIGIN'),
		"message": "Cookie test endpoint"
	})


# Authentication test endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def auth_test(request):
	"""Test authentication status"""
	print("\n🔍=== AUTH TEST DEBUG ===")
	print(f"Path: {request.path}")
	print(f"Method: {request.method}")
	print(f"Session key: {request.session.session_key if hasattr(request, 'session') else 'No session'}")
	print(f"Request user: {request.user if hasattr(request, 'user') else 'No user attr'}")
	print(f"User is_authenticated: {request.user.is_authenticated if hasattr(request, 'user') else 'No user attr'}")
	print(f"Session data: {dict(request.session) if hasattr(request, 'session') else 'No session'}")
	print(f"Session exists: {hasattr(request, 'session')}")
	
	user = get_session_user(request)
	print(f"get_session_user returned: {user}")
	print("🔍=== END AUTH TEST DEBUG ===\n")
	
	return Response({
		"authenticated": user is not None,
		"user": {
			"id": str(user.id) if user else None,
			"username": user.username if user else None,
			"email": user.email if user else None
		} if user else None,
		"session_key": request.session.session_key if hasattr(request, 'session') else None,
		"session_data": dict(request.session) if hasattr(request, 'session') else None,
		"request_user": str(request.user) if hasattr(request, 'user') else None,
		"request_user_authenticated": request.user.is_authenticated if hasattr(request, 'user') else False,
		"cookies": dict(request.COOKIES) if hasattr(request, 'COOKIES') else None
	})


# User Management Views
class UserProfileView(generics.RetrieveAPIView):
	"""Get user profile"""
	serializer_class = UserSerializer
	permission_classes = [AllowAny]
	
	def get_object(self):
		user = get_session_user(self.request)
		if not user:
			raise PermissionDenied("Authentication required")
		return user


class UserStartupsView(generics.ListAPIView):
	"""Get user's startups"""
	serializer_class = UserStartupSerializer
	permission_classes = [AllowAny]
	
	def get_queryset(self):
		user = get_session_user(self.request)
		if not user:
			return Startup.objects.none()
		return Startup.objects.filter(owner=user)


# Statistics Views
@api_view(['GET'])
@permission_classes([AllowAny])
def platform_stats(request):
	"""Get platform statistics"""
	total_startups = Startup.objects.count()
	total_users = User.objects.count()
	total_applications = Application.objects.count()
	total_collaborations = Application.objects.filter(status='approved').count()
	
	# Recent activity (simplified)
	recent_activity = [
		{
			"type": "startup_created",
			"message": "New startup listing created",
			"timestamp": "2024-01-01T00:00:00Z"
		}
	]
	
	return Response({
		"totalStartups": total_startups,
		"totalUsers": total_users,
		"totalTransactions": 0,  # Placeholder
		"totalCollaborations": total_collaborations,
		"recentActivity": recent_activity
	})


# Search Views
class SearchView(generics.ListAPIView):
	"""Search startups"""
	serializer_class = StartupListSerializer
	permission_classes = [AllowAny]
	
	def get_queryset(self):
		# Get search parameters from frontend
		query = self.request.query_params.get('query', '')
		category = self.request.query_params.get('category', '')
		search_type = self.request.query_params.get('type', '')
		phase = self.request.query_params.get('phase', '')
		field = self.request.query_params.get('field', '')
		team_size = self.request.query_params.get('team_size', '')
		funding_stage = self.request.query_params.get('funding_stage', '')
		limit = int(self.request.query_params.get('limit', 20))
		
		# Only return verified active startups to the public
		queryset = Startup.objects.filter(status='active', verification_status='verified')
		
		# Apply text search
		if query:
			queryset = queryset.filter(
				Q(title__icontains=query) |
				Q(description__icontains=query) |
				Q(field__icontains=query)
			)
		
		# Apply filters
		if search_type:
			queryset = queryset.filter(type=search_type)
		
		if category:
			queryset = queryset.filter(category=category)
		
		if phase:
			queryset = queryset.filter(phase__icontains=phase)
		
		if field:
			queryset = queryset.filter(field__icontains=field)
		
		if team_size:
			queryset = queryset.filter(team_size__icontains=team_size)
		
		# funding_stage could be mapped to phase or handled differently
		if funding_stage:
			queryset = queryset.filter(phase__icontains=funding_stage)
		
		return queryset.order_by('-created_at')[:limit]
	
	def list(self, request, *args, **kwargs):
		# Get full queryset before limit for count
		query = self.request.query_params.get('query', '')
		category = self.request.query_params.get('category', '')
		search_type = self.request.query_params.get('type', '')
		phase = self.request.query_params.get('phase', '')
		field = self.request.query_params.get('field', '')
		team_size = self.request.query_params.get('team_size', '')
		funding_stage = self.request.query_params.get('funding_stage', '')
		
		# Build queryset for count — only verified active startups
		full_queryset = Startup.objects.filter(status='active', verification_status='verified')
		
		if query:
			full_queryset = full_queryset.filter(
				Q(title__icontains=query) |
				Q(description__icontains=query) |
				Q(field__icontains=query)
			)
		
		if search_type:
			full_queryset = full_queryset.filter(type=search_type)
		
		if category:
			full_queryset = full_queryset.filter(category=category)
		
		if phase:
			full_queryset = full_queryset.filter(phase__icontains=phase)
		
		if field:
			full_queryset = full_queryset.filter(field__icontains=field)
		
		if team_size:
			full_queryset = full_queryset.filter(team_size__icontains=team_size)
		
		if funding_stage:
			full_queryset = full_queryset.filter(phase__icontains=funding_stage)
		
		total_count = full_queryset.count()
		
		# Get limited results
		queryset = self.get_queryset()
		serializer = self.get_serializer(queryset, many=True)
		
		return Response({
			"results": serializer.data,
			"count": total_count
		})


# ==================== NEW MISSING ENDPOINTS ====================

# Messaging System Views
class ConversationListView(generics.ListCreateAPIView):
	"""List user's conversations or create new conversation"""
	serializer_class = ConversationSerializer
	permission_classes = [AllowAny]
	
	def get_queryset(self):
		user = get_session_user(self.request)
		if not user:
			return Conversation.objects.none()
		return Conversation.objects.filter(
			participants=user,
			is_active=True
		).prefetch_related('participants', 'messages').order_by('-updated_at')
	
	def get_serializer_class(self):
		if self.request.method == 'POST':
			return ConversationCreateSerializer
		return ConversationSerializer

	def get_serializer_context(self):
		context = super().get_serializer_context()
		context['current_user'] = get_session_user(self.request)
		return context

	def list(self, request, *args, **kwargs):
		user = get_session_user(request)
		if not user:
			return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
		queryset = self.filter_queryset(self.get_queryset())
		serializer = self.get_serializer(queryset, many=True)
		return Response(serializer.data)

	def create(self, request, *args, **kwargs):
		user = get_session_user(request)
		if not user:
			return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		participant_ids = serializer.validated_data.get('participant_ids', [])
		startup_id = serializer.validated_data.get('startup_id')
		# If this is a direct chat (single other participant), reuse existing conversation when available
		if not startup_id and participant_ids and len(participant_ids) == 1:
			target_id = str(participant_ids[0])
			if target_id != str(user.id):
				existing = Conversation.objects.filter(
					participants=user,
					is_active=True
				).filter(participants__id=target_id).order_by('-updated_at').first()
				if existing:
					read_serializer = ConversationSerializer(existing, context={'request': request, 'current_user': user})
					return Response(read_serializer.data, status=status.HTTP_200_OK)
		conversation = serializer.save()
		conversation.refresh_from_db()
		read_serializer = ConversationSerializer(conversation, context={'request': request, 'current_user': user})
		headers = self.get_success_headers(read_serializer.data)
		return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ConversationDetailView(generics.RetrieveAPIView):
	"""Get conversation details"""
	serializer_class = ConversationSerializer
	permission_classes = [AllowAny]
	
	def get_queryset(self):
		user = get_session_user(self.request)
		if not user:
			return Conversation.objects.none()
		return Conversation.objects.filter(
			participants=user,
			is_active=True
		)

	def get_serializer_context(self):
		context = super().get_serializer_context()
		context['current_user'] = get_session_user(self.request)
		return context

	def delete(self, request, *args, **kwargs):
		from django.db import transaction
		user = get_session_user(request)
		if not user:
			return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

		try:
			with transaction.atomic():
				# Fetch conversation with its team link
				conversation = Conversation.objects.select_related('team', 'team__startup').get(id=kwargs.get('pk'), is_active=True)
				
				# Security check: Ensure the user is a participant
				if not conversation.participants.filter(id=user.id).exists():
					return Response({"error": "You are not a participant in this conversation"}, status=status.HTTP_403_FORBIDDEN)

				# If it's a team chat, we remove the connection so a new team can be created
				if conversation.team:
					startup = conversation.team.startup
					if str(startup.owner_id) != str(user.id):
						return Response({"error": "Only the startup founder can dissolve this team"}, status=status.HTTP_403_FORBIDDEN)
					
					# 1. Capture the team record
					old_team = conversation.team
					
					# 2. BREAK THE CONNECTION FIRST
					# We set team to None and is_active to False. This "orphans" the chat but keeps it in DB.
					conversation.team = None
					conversation.is_active = False
					# Saving here ensures the DB is updated before the team record is actually gone
					conversation.save(update_fields=['team', 'is_active', 'updated_at'])
					
					# 3. Delete only the "Team" link record.
					# This allows a new Team with a new ID to be created for this startup.
					# The Conversation and Messages stay in DB because of SET_NULL on the foreign key.
					old_team.delete()
					print(f"✅ Team connection removed for startup: {startup.title}")
				else:
					# For direct chats, just deactivate
					conversation.is_active = False
					conversation.save(update_fields=['is_active', 'updated_at'])
				
				return Response({"message": "Team connection removed successfully"}, status=status.HTTP_200_OK)

		except Conversation.DoesNotExist:
			return Response({"error": "Conversation not found or already removed"}, status=status.HTTP_404_NOT_FOUND)
		except Exception as e:
			print(f"❌ Error during team removal: {str(e)}")
			import traceback
			traceback.print_exc()
			return Response({"error": f"Failed to remove team: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MessageListView(generics.ListCreateAPIView):
	"""List messages in conversation or send new message"""
	serializer_class = MessageSerializer
	permission_classes = [AllowAny]
	
	def get_queryset(self):
		conversation_id = self.kwargs.get('conversation_id')
		user = get_session_user(self.request)
		if not user:
			return Message.objects.none()
		queryset = Message.objects.filter(
			conversation_id=conversation_id,
			conversation__participants=user,
			conversation__is_active=True
		).select_related('sender').order_by('created_at')
		conversation = queryset.first().conversation if queryset.exists() else None
		if conversation and conversation.team:
			is_founder = conversation.team.startup.owner_id == user.id
			is_team_member = conversation.team.members.filter(user=user).exists()
			if not is_founder and not is_team_member:
				removal_message = queryset.filter(
					event_type="user_removed",
					content=f"{user.username} is removed"
				).order_by('-created_at').first()
				if removal_message:
					queryset = queryset.filter(created_at__lte=removal_message.created_at)
		return queryset
	
	def get_serializer_class(self):
		if self.request.method == 'POST':
			return MessageCreateSerializer
		return MessageSerializer

	def get_serializer_context(self):
		context = super().get_serializer_context()
		context['current_user'] = get_session_user(self.request)
		return context

	def list(self, request, *args, **kwargs):
		user = get_session_user(request)
		if not user:
			return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
		queryset = self.filter_queryset(self.get_queryset())
		serializer = self.get_serializer(queryset, many=True)
		return Response(serializer.data)

	def create(self, request, *args, **kwargs):
		user = get_session_user(request)
		if not user:
			return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
		conversation_id = self.kwargs.get('conversation_id')
		try:
			conversation = Conversation.objects.get(
				id=conversation_id,
				participants=user,
				is_active=True
			)
		except Conversation.DoesNotExist:
			raise PermissionDenied("Conversation not found")
		if conversation.team:
			is_founder = conversation.team.startup.owner_id == user.id
			is_team_member = conversation.team.members.filter(user=user).exists()
			if not is_founder and not is_team_member:
				return Response(
					{"error": "You were removed from this team and cannot send messages."},
					status=status.HTTP_403_FORBIDDEN
				)
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		message = serializer.save(conversation=conversation, sender=user)
		conversation.save(update_fields=['updated_at'])
		read_serializer = MessageSerializer(message, context={'request': request})
		headers = self.get_success_headers(read_serializer.data)
		return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


@api_view(['GET'])
@permission_classes([AllowAny])
@csrf_exempt
def get_online_users(request):
	"""Backward-compatible messaging endpoint backed by cache presence."""
	user = get_presence_user(request)
	if not user:
		return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
	online_users = PresenceService.get_online_users_for_user(user)
	serializer = UserSerializer(online_users, many=True)
	return Response(serializer.data)


def get_presence_user(request):
	"""Resolve auth for frequent presence calls without unnecessary session scans."""
	if hasattr(request, 'user') and request.user.is_authenticated and hasattr(request.user, 'id'):
		return request.user
	if hasattr(request, 'session') and request.session.get('is_authenticated') and 'user_id' in request.session:
		try:
			return User.objects.get(id=request.session['user_id'], is_active=True)
		except (User.DoesNotExist, ValueError):
			return None
	return get_session_user(request)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def presence_heartbeat(request):
	"""Record current user's presence heartbeat in Django cache."""
	user = get_presence_user(request)
	if not user:
		return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
	last_seen = PresenceService.mark_seen(user)
	return Response({"ok": True, "last_seen": last_seen}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
@csrf_exempt
def presence_online_users(request):
	"""Return currently online users, internally filtered by preference overlap."""
	user = get_presence_user(request)
	if not user:
		return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
	online_users = PresenceService.get_online_users_for_user(user)
	serializer = UserSerializer(online_users, many=True)
	return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
@csrf_exempt
def presence_all_users(request):
	"Return all platform users (excluding self) for team/group creation."
	from django.contrib.auth import get_user_model
	UserModel = get_user_model()
	user = get_presence_user(request)
	if not user:
		return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
	all_users = UserModel.objects.exclude(id=user.id).order_by('username')
	serializer = UserSerializer(all_users, many=True, context={'request': request})
	return Response(serializer.data)



@api_view(['GET'])
@permission_classes([AllowAny])
@csrf_exempt
def presence_user(request, user_id):
	"""Return cache-derived online state for a single user."""
	last_seen = PresenceService.get_last_seen(user_id)
	return Response({
		"is_online": PresenceService.is_online(user_id),
		"last_seen": last_seen,
	}, status=status.HTTP_200_OK)


# User Profile Management Views
class UserProfileDetailView(generics.RetrieveUpdateAPIView):
	"""Get or update user profile"""
	serializer_class = UserProfileSerializer
	permission_classes = [AllowAny]
	
	def get_object(self):
		user = get_session_user(self.request)
		if not user:
			raise PermissionDenied("Authentication required")
		profile, created = UserProfile.objects.get_or_create(user=user)
		return profile
	
	def get_serializer_class(self):
		if self.request.method in ['PUT', 'PATCH']:
			return UserProfileUpdateSerializer
		return UserProfileSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def get_account_by_token(request, token):
	"""Get account by token (for frontend compatibility)"""
	try:
		# Verify token and get user
		from .authentication import JWTAuthentication
		auth = JWTAuthentication()
		user, _ = auth.authenticate(request)
		
		if not user:
			return Response({"error": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)
		
		# Get or create profile
		profile, created = UserProfile.objects.get_or_create(user=user)
		
		serializer = UserProfileSerializer(profile)
		return Response(serializer.data)
		
	except Exception as e:
		return Response({"error": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)


# File Upload Views
class FileUploadView(generics.CreateAPIView):
	"""Upload files (resume, images, etc.)"""
	serializer_class = FileUploadCreateSerializer
	permission_classes = [AllowAny]
	parser_classes = [rest_framework.parsers.MultiPartParser, rest_framework.parsers.FormParser]
	
	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		if serializer.is_valid():
			file_upload = serializer.save()
			response_serializer = FileUploadSerializer(file_upload)
			return Response(response_serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FileUploadListView(generics.ListAPIView):
	"""List user's uploaded files"""
	serializer_class = FileUploadSerializer
	permission_classes = [AllowAny]
	
	def get_queryset(self):
		user = get_session_user(self.request)
		if not user:
			return FileUpload.objects.none()
		file_type = self.request.query_params.get('type')
		queryset = FileUpload.objects.filter(user=user, is_active=True)
		if file_type:
			queryset = queryset.filter(file_type=file_type)
		return queryset.order_by('-created_at')


@api_view(['POST'])
@permission_classes([AllowAny])
def upload_resume(request):
	"""Upload resume file"""
	user = get_session_user(request)
	if not user:
		return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
	if 'file' not in request.FILES:
		return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
	
	file = request.FILES['file']
	file_upload = FileUpload.objects.create(
		user=user,
		file=file,
		file_type='resume',
		original_name=file.name,
		file_size=file.size,
		mime_type=file.content_type
	)
	
	serializer = FileUploadSerializer(file_upload)
	return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def upload_startup_image(request):
	"""Upload startup image"""
	user = get_session_user(request)
	if not user:
		return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
	if 'file' not in request.FILES:
		return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
	
	file = request.FILES['file']
	file_upload = FileUpload.objects.create(
		user=user,
		file=file,
		file_type='startup_image',
		original_name=file.name,
		file_size=file.size,
		mime_type=file.content_type
	)
	
	serializer = FileUploadSerializer(file_upload)
	return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def upload_profile_picture(request):
	"""Upload profile picture"""
	user = get_session_user(request)
	if not user:
		return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
	if 'file' not in request.FILES:
		return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
	
	file = request.FILES['file']
	file_upload = FileUpload.objects.create(
		user=user,
		file=file,
		file_type='profile_picture',
		original_name=file.name,
		file_size=file.size,
		mime_type=file.content_type
	)
	
	# Update user profile with new picture
	profile, created = UserProfile.objects.get_or_create(user=user)
	profile.profile_picture = file
	
	if 'original_file' in request.FILES:
		profile.original_profile_picture = request.FILES['original_file']
	if 'crop_data' in request.POST:
		import json
		try:
			profile.profile_picture_crop = json.loads(request.POST['crop_data'])
		except:
			pass
	
	profile.save()
	
	serializer = FileUploadSerializer(file_upload)
	return Response(serializer.data, status=status.HTTP_201_CREATED)


# Additional utility endpoints

@api_view(['POST'])
@permission_classes([AllowAny])
def record_profile_view(request, user_id):
	"""Increment profile view count for a specific user with a 6-hour cooldown"""
	try:
		from .messaging_models import UserProfile, ProfileView
		from django.utils import timezone
		from datetime import timedelta
		
		profile = UserProfile.objects.get(user_id=user_id)
		viewer = get_session_user(request)
		
		# 1. Self-view check
		if viewer and str(viewer.id) == str(user_id):
			return Response({"status": "ignored", "reason": "self_view"}, status=status.HTTP_200_OK)
			
		# 2. Cooldown check (6 hours)
		cooldown_time = timezone.now() - timedelta(hours=6)
		
		# Filter by viewer (if logged in) or IP (if guest, though for now we focus on logged in users)
		existing_view = ProfileView.objects.filter(
			viewer=viewer,
			viewed_profile=profile,
			timestamp__gte=cooldown_time
		).exists()
		
		if existing_view:
			return Response({"status": "ignored", "reason": "cooldown_active"}, status=status.HTTP_200_OK)
			
		# 3. Success: Log the view and increment counter
		ProfileView.objects.create(viewer=viewer, viewed_profile=profile)
		profile.views += 1
		profile.save(update_fields=['views'])
		
		return Response({"status": "success", "views": profile.views}, status=status.HTTP_200_OK)
	except (UserProfile.DoesNotExist, ValueError):
		return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)


class PublicPeopleListView(generics.ListAPIView):
	"""List all users who have made their profile public (Collaborator Network)"""
	permission_classes = [AllowAny]

	def get(self, request, *args, **kwargs):
		from .messaging_models import UserProfile
		q = request.query_params.get('q', '').strip().lower()

		profiles = UserProfile.objects.filter(is_public=True).select_related('user')

		results = []
		for profile in profiles:
			u = profile.user
			username = u.username if u else ''
			first_name = (u.first_name or '').strip() if u else ''
			last_name  = (u.last_name  or '').strip() if u else ''
			full_name  = f"{first_name} {last_name}".strip() or username
			bio = profile.bio or ''
			location = profile.location or ''
			skills = profile.skills or []
			experience = profile.experience or []
			references = profile.references or []
			github_url = getattr(profile, 'github_url', '') or ''
			linkedin_url = getattr(profile, 'linkedin_url', '') or ''
			website = profile.website or ''
			profile_picture = None
			if profile.profile_picture:
				try:
					profile_picture = request.build_absolute_uri(profile.profile_picture.url)
				except Exception:
					profile_picture = None
			selected_regions = profile.selected_regions or []

			# Search filter
			if q:
				haystack = ' '.join([
					full_name.lower(),
					username.lower(),
					bio.lower(),
					location.lower(),
					' '.join([str(s.get('title', '')) for s in skills if isinstance(s, dict)]).lower()
				])
				if q not in haystack:
					continue

			results.append({
				'id': str(u.id),
				'username': username,
				'first_name': first_name,
				'last_name': last_name,
				'full_name': full_name,
				'email': u.email if u else '',
				'role': u.role if u else '',
				'bio': bio,
				'location': location,
				'skills': skills,
				'experience': experience,
				'references': references,
				'github_url': github_url,
				'linkedin_url': linkedin_url,
				'website': website,
				'profile_picture': profile_picture,
				'selected_regions': selected_regions,
			})

		return Response({'results': results, 'count': len(results)})


class ProfileDataView(generics.RetrieveUpdateAPIView):
	"""Get and update comprehensive user profile data for account settings"""
	permission_classes = [AllowAny]
	
	def get_object(self):
		user = get_session_user(self.request)
		if not user or not hasattr(user, 'id'):
			raise PermissionDenied("Authentication required")
		profile, created = UserProfile.objects.get_or_create(user=user)
		return profile
	
	def get_serializer_class(self):
		if self.request.method in ['PUT', 'PATCH']:
			return UserProfileUpdateSerializer
		return UserProfileSerializer
	
	def get(self, request, *args, **kwargs):
		"""Get comprehensive user profile data for account settings"""
		print(f"\n{'='*80}")
		print(f"📊 PROFILE DATA REQUEST")
		print(f"{'='*80}")
		
		user = get_session_user(request)
		if not user or not hasattr(user, 'id'):
			print(f"❌ No authenticated user found")
			print(f"{'='*80}\n")
			return Response(
				{"error": "Authentication required"},
				status=status.HTTP_401_UNAUTHORIZED
			)
		
		print(f"✅ User: {user.username} (ID: {user.id})")
		
		profile, created = UserProfile.objects.get_or_create(user=user)
		
		# Get user's startups
		user_startups = Startup.objects.filter(owner=user)
		print(f"🚀 Found {user_startups.count()} startups for user")
		
		# Log each startup
		for startup in user_startups:
			print(f"\n  📋 Startup: {startup.title}")
			print(f"    - ID: {startup.id}")
			print(f"    - Type: {startup.type}")
			print(f"    - Category: {startup.category}")
			print(f"    - Revenue: {startup.revenue}")
			print(f"    - Profit: {startup.profit}")
			print(f"    - Asking Price: {startup.asking_price}")
			print(f"    - Earn Through: {startup.earn_through}")
			print(f"    - Team Size: {startup.team_size}")
		
		startups_serializer = UserStartupSerializer(user_startups, many=True)
		print(f"\n📤 Serialized startups data:")
		print(f"{startups_serializer.data}")
		
		# Get user's applications
		user_applications = Application.objects.filter(applicant=user)
		applications_serializer = ApplicationSerializer(user_applications, many=True)
		
		# Get user's favorites
		user_favorites = Favorite.objects.filter(user=user)
		favorites_serializer = FavoriteSerializer(user_favorites, many=True)
		
		# Get user's interests
		user_interests = Interest.objects.filter(user=user)
		
		# Calculate total applications received by all user's startups
		applications_received = Application.objects.filter(startup__owner=user).count()
		
		profile_serializer = UserProfileSerializer(profile, context={'request': request})
		
		# Check onboarding status
		from .recommendation_models import UserOnboardingPreferences
		onboarding_prefs, _ = UserOnboardingPreferences.objects.get_or_create(user=user)
		
		response_data = {
			'profile': profile_serializer.data,
			'onboarding_completed': onboarding_prefs.onboarding_completed,
			'startups': startups_serializer.data,
			'applications': applications_serializer.data,
			'favorites': favorites_serializer.data,
			'stats': {
				'startups_created': user_startups.count(),
				'applications_submitted': user_applications.count(),
				'applications_received': applications_received,
				'favorites_count': user_favorites.count(),
				'interests_count': user_interests.count(),
				'profile_views': profile.views,
			}
		}
		
		print(f"\n✅ Sending response with {len(startups_serializer.data)} startups")
		print(f"{'='*80}\n")
		
		return Response(response_data)
	
	def patch(self, request, *args, **kwargs):
		"""Update comprehensive user profile data"""
		user = get_session_user(request)
		if not user or not hasattr(user, 'id'):
			return Response(
				{"error": "Authentication required"},
				status=status.HTTP_401_UNAUTHORIZED
			)
		
		profile, created = UserProfile.objects.get_or_create(user=user)
		
		serializer = UserProfileUpdateSerializer(profile, data=request.data, partial=True)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Recommendation System Endpoints
class OnboardingPreferencesView(generics.RetrieveUpdateAPIView, generics.CreateAPIView):
	"""Get, create, or update user onboarding preferences"""
	permission_classes = [AllowAny]
	serializer_class = UserOnboardingPreferencesSerializer
	
	def get_object(self):
		user = get_session_user(self.request)
		if not user:
			raise PermissionDenied("Authentication required")
		from .recommendation_models import UserOnboardingPreferences
		prefs, created = UserOnboardingPreferences.objects.get_or_create(user=user)
		return prefs
	
	def create(self, request, *args, **kwargs):
		user = get_session_user(request)
		if not user:
			return Response(
				{"error": "Authentication required"},
				status=status.HTTP_401_UNAUTHORIZED
			)
		from .recommendation_models import UserOnboardingPreferences
		prefs, created = UserOnboardingPreferences.objects.get_or_create(user=user)
		serializer = self.get_serializer(prefs, data=request.data, partial=True)
		if serializer.is_valid():
			serializer.save(onboarding_completed=True)
			return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def like_startup(request, pk):
	"""Like a startup - uses service layer"""
	user = get_session_user(request)
	if not user:
		return Response(
			{"error": "Authentication required"},
			status=status.HTTP_401_UNAUTHORIZED
		)
	
	print(f"🔍 [like_startup] User: {user.id}, Startup ID: {pk}")
	try:
		startup = Startup.objects.get(pk=pk)
		print(f"✅ [like_startup] Startup found: {startup.title}")
	except Startup.DoesNotExist:
		print(f"❌ [like_startup] Startup not found: {pk}")
		return Response(
			{"error": "Startup not found"},
			status=status.HTTP_404_NOT_FOUND
		)
	
	from .recommendation_models import UserInteraction
	from .services.interaction_service import InteractionService
	
	# Get recommendation context (optional)
	recommendation_session_id = request.data.get('recommendation_session_id') or request.GET.get('recommendation_session_id')
	recommendation_rank = request.data.get('recommendation_rank') or request.GET.get('recommendation_rank')
	
	# Build metadata using service
	metadata, recommendation_context = InteractionService.build_interaction_metadata(
		recommendation_session_id=recommendation_session_id,
		recommendation_rank=recommendation_rank,
		user_id=str(user.id)
	)
	
	# Remove any existing dislike
	UserInteraction.objects.filter(
		user=user,
		startup=startup,
		interaction_type='dislike'
	).delete()
	
	# Create interaction using service
	interaction, created = InteractionService.create_interaction(
		user=user,
		startup=startup,
		interaction_type='like',
		metadata=metadata,
		recommendation_context=recommendation_context
	)
	
	print(f"✅ [like_startup] Interaction {'created' if created else 'already exists'}: {interaction.id}")
	_invalidate_user_cache(user.id, startup.id, 'like')
	return Response({
		"message": "Startup liked" if created else "Startup already liked",
		"interaction_id": str(interaction.id),
		"source": metadata.get('source', 'organic')
	}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([AllowAny])
@csrf_exempt
def unlike_startup(request, pk):
	"""Remove like from a startup"""
	user = get_session_user(request)
	if not user:
		return Response(
			{"error": "Authentication required"},
			status=status.HTTP_401_UNAUTHORIZED
		)
	
	print(f"🔍 [unlike_startup] User: {user.id}, Startup ID: {pk}")
	try:
		startup = Startup.objects.get(pk=pk)
		print(f"✅ [unlike_startup] Startup found: {startup.title}")
	except Startup.DoesNotExist:
		print(f"❌ [unlike_startup] Startup not found: {pk}")
		return Response(
			{"error": "Startup not found"},
			status=status.HTTP_404_NOT_FOUND
		)
	
	from .recommendation_models import UserInteraction
	
	deleted = UserInteraction.objects.filter(
		user=user,
		startup=startup,
		interaction_type='like'
	).delete()
	
	print(f"✅ [unlike_startup] Deleted {deleted[0]} like interaction(s)")
	_invalidate_user_cache(user.id, startup.id, 'unlike')
	return Response({
		"message": "Like removed",
		"deleted": deleted[0] > 0
	}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def dislike_startup(request, pk):
	"""Dislike a startup - uses service layer"""
	user = get_session_user(request)
	if not user:
		return Response(
			{"error": "Authentication required"},
			status=status.HTTP_401_UNAUTHORIZED
		)
	
	print(f"🔍 [dislike_startup] User: {user.id}, Startup ID: {pk}")
	try:
		startup = Startup.objects.get(pk=pk)
		print(f"✅ [dislike_startup] Startup found: {startup.title}")
	except Startup.DoesNotExist:
		print(f"❌ [dislike_startup] Startup not found: {pk}")
		return Response(
			{"error": "Startup not found"},
			status=status.HTTP_404_NOT_FOUND
		)
	
	from .recommendation_models import UserInteraction
	from .services.interaction_service import InteractionService
	
	# Get recommendation context (optional)
	recommendation_session_id = request.data.get('recommendation_session_id') or request.GET.get('recommendation_session_id')
	recommendation_rank = request.data.get('recommendation_rank') or request.GET.get('recommendation_rank')
	
	# Build metadata using service
	metadata, recommendation_context = InteractionService.build_interaction_metadata(
		recommendation_session_id=recommendation_session_id,
		recommendation_rank=recommendation_rank,
		user_id=str(user.id)
	)
	
	# Remove any existing like
	UserInteraction.objects.filter(
		user=user,
		startup=startup,
		interaction_type='like'
	).delete()
	
	# Create interaction using service
	interaction, created = InteractionService.create_interaction(
		user=user,
		startup=startup,
		interaction_type='dislike',
		metadata=metadata,
		recommendation_context=recommendation_context
	)
	
	print(f"✅ [dislike_startup] Interaction {'created' if created else 'already exists'}: {interaction.id}")
	_invalidate_user_cache(user.id, startup.id, 'dislike')
	return Response({
		"message": "Startup disliked" if created else "Startup already disliked",
		"interaction_id": str(interaction.id),
		"source": metadata.get('source', 'organic')
	}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([AllowAny])
@csrf_exempt
def undislike_startup(request, pk):
	"""Remove dislike from a startup"""
	user = get_session_user(request)
	if not user:
		return Response(
			{"error": "Authentication required"},
			status=status.HTTP_401_UNAUTHORIZED
		)
	
	print(f"🔍 [undislike_startup] User: {user.id}, Startup ID: {pk}")
	try:
		startup = Startup.objects.get(pk=pk)
		print(f"✅ [undislike_startup] Startup found: {startup.title}")
	except Startup.DoesNotExist:
		print(f"❌ [undislike_startup] Startup not found: {pk}")
		return Response(
			{"error": "Startup not found"},
			status=status.HTTP_404_NOT_FOUND
		)
	
	from .recommendation_models import UserInteraction
	
	deleted = UserInteraction.objects.filter(
		user=user,
		startup=startup,
		interaction_type='dislike'
	).delete()
	
	print(f"✅ [undislike_startup] Deleted {deleted[0]} dislike interaction(s)")
	_invalidate_user_cache(user.id, startup.id, 'undislike')
	return Response({
		"message": "Dislike removed",
		"deleted": deleted[0] > 0
	}, status=status.HTTP_200_OK)



@api_view(['GET'])
@permission_classes([AllowAny])
def startup_interaction_status(request, pk):
	"""Get user's interaction status for a startup"""
	user = get_session_user(request)
	if not user:
		return Response(
			{"error": "Authentication required"},
			status=status.HTTP_401_UNAUTHORIZED
		)
	
	try:
		print(f"?? [startup_interaction_status] Checking status for startup: {pk}, user: {user.id}")
		startup = Startup.objects.get(pk=pk)
	except Startup.DoesNotExist:
		print(f"? [startup_interaction_status] Startup not found: {pk}")
		return Response(
			{"error": "Startup not found"},
			status=status.HTTP_404_NOT_FOUND
		)
	
	from .recommendation_models import UserInteraction
	
	# Check for various interactions
	has_like = UserInteraction.objects.filter(
		user=user,
		startup=startup,
		interaction_type='like'
	).exists()
	
	has_dislike = UserInteraction.objects.filter(
		user=user,
		startup=startup,
		interaction_type='dislike'
	).exists()
	
	has_favorite = Favorite.objects.filter(user=user, startup=startup).exists()
	has_interest = Interest.objects.filter(user=user, startup=startup).exists()
	
	print(f"? [startup_interaction_status] Status - Like: {has_like}, Dislike: {has_dislike}, Favorite: {has_favorite}, Interest: {has_interest}")
	has_application = Application.objects.filter(applicant=user, startup=startup).exists()
	
	serializer = StartupInteractionStatusSerializer({
		'has_like': has_like,
		'has_dislike': has_dislike,
		'has_favorite': has_favorite,
		'has_interest': has_interest,
		'has_application': has_application
	})
	
	return Response(serializer.data, status=status.HTTP_200_OK)


# ── Admin Portal Views ────────────────────────────────────────────────────────

class IsStaffUser(permissions.BasePermission):
	"""Allow access only to staff/superuser accounts."""
	def has_permission(self, request, view):
		user = get_session_user(request)
		return bool(user and (user.is_staff or user.is_superuser))


class AdminStatsView(generics.GenericAPIView):
	"""Platform overview stats for admin portal."""
	permission_classes = [AllowAny]

	def get(self, request):
		user = get_session_user(request)
		if not user or not (user.is_staff or user.is_superuser):
			return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

		total_users = User.objects.count()
		total_startups = Startup.objects.count()
		pending = Startup.objects.filter(verification_status='under_verification').count()
		verified = Startup.objects.filter(verification_status='verified').count()
		rejected = Startup.objects.filter(verification_status='rejected').count()
		more_info = Startup.objects.filter(verification_status='more_info_required').count()
		suspended = Startup.objects.filter(verification_status='suspended').count()
		total_applications = Application.objects.count()

		return Response({
			'total_users': total_users,
			'total_startups': total_startups,
			'total_applications': total_applications,
			'verification': {
				'under_verification': pending,
				'verified': verified,
				'rejected': rejected,
				'more_info_required': more_info,
				'suspended': suspended,
			}
		})


class AdminStartupListView(generics.ListAPIView):
	"""List all startups for admin portal with optional status filter."""
	serializer_class = AdminStartupSerializer
	permission_classes = [AllowAny]

	def get_queryset(self):
		user = get_session_user(self.request)
		if not user or not (user.is_staff or user.is_superuser):
			return Startup.objects.none()

		qs = Startup.objects.select_related('owner').prefetch_related('tags', 'applications').order_by('-created_at')
		v_status = self.request.query_params.get('verification_status')
		search = self.request.query_params.get('search', '').strip()
		if v_status:
			qs = qs.filter(verification_status=v_status)
		if search:
			qs = qs.filter(Q(title__icontains=search) | Q(owner__username__icontains=search) | Q(owner__email__icontains=search))
		return qs

	def list(self, request, *args, **kwargs):
		user = get_session_user(request)
		if not user or not (user.is_staff or user.is_superuser):
			return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
		qs = self.get_queryset()
		serializer = self.get_serializer(qs, many=True)
		return Response({'results': serializer.data, 'count': qs.count()})


class AdminVerifyStartupView(generics.GenericAPIView):
	"""Update verification_status of a startup (admin only)."""
	permission_classes = [AllowAny]

	VALID_STATUSES = {'under_verification', 'verified', 'rejected', 'more_info_required', 'suspended'}

	def patch(self, request, pk):
		user = get_session_user(request)
		if not user or not (user.is_staff or user.is_superuser):
			return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

		new_status = request.data.get('verification_status')
		if not new_status or new_status not in self.VALID_STATUSES:
			return Response(
				{'error': f'Invalid status. Choose from: {", ".join(sorted(self.VALID_STATUSES))}'},
				status=status.HTTP_400_BAD_REQUEST
			)

		try:
			startup = Startup.objects.get(pk=pk)
		except Startup.DoesNotExist:
			return Response({'error': 'Startup not found'}, status=status.HTTP_404_NOT_FOUND)

		startup.verification_status = new_status
		startup.save(update_fields=['verification_status', 'updated_at'])

		serializer = AdminStartupSerializer(startup)
		return Response({'message': f'Status updated to {new_status}', 'startup': serializer.data})


class AdminUserListView(generics.ListAPIView):
	"""List all users for admin portal."""
	serializer_class = AdminUserSerializer
	permission_classes = [AllowAny]

	def get_queryset(self):
		user = get_session_user(self.request)
		if not user or not (user.is_staff or user.is_superuser):
			return User.objects.none()

		qs = User.objects.prefetch_related('startups', 'applications').order_by('-created_at')
		search = self.request.query_params.get('search', '').strip()
		role = self.request.query_params.get('role', '').strip()
		if search:
			qs = qs.filter(Q(username__icontains=search) | Q(email__icontains=search))
		if role:
			qs = qs.filter(role=role)
		return qs

	def list(self, request, *args, **kwargs):
		user = get_session_user(request)
		if not user or not (user.is_staff or user.is_superuser):
			return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
		qs = self.get_queryset()
		serializer = self.get_serializer(qs, many=True)
		return Response({'results': serializer.data, 'count': qs.count()})


class AdminStartupDetailView(generics.GenericAPIView):
	"""GET or PATCH a single startup (admin only) — supports full field editing."""
	permission_classes = [AllowAny]

	EDITABLE_FIELDS = {
		'title', 'description', 'field', 'category', 'type', 'status',
		'verification_status', 'phase', 'team_size', 'website_url',
		'revenue', 'profit', 'asking_price',
		'ttm_revenue', 'ttm_profit', 'last_month_revenue', 'last_month_profit',
		'earn_through',
	}

	VALID_VERIFICATION_STATUSES = {
		'under_verification', 'verified', 'rejected', 'more_info_required', 'suspended'
	}

	def _get_startup(self, pk):
		try:
			return Startup.objects.select_related('owner').prefetch_related('tags', 'applications').get(pk=pk)
		except Startup.DoesNotExist:
			return None

	def get(self, request, pk):
		user = get_session_user(request)
		if not user or not (user.is_staff or user.is_superuser):
			return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

		startup = self._get_startup(pk)
		if not startup:
			return Response({'error': 'Startup not found'}, status=status.HTTP_404_NOT_FOUND)

		serializer = AdminStartupSerializer(startup)
		return Response(serializer.data)

	def patch(self, request, pk):
		user = get_session_user(request)
		if not user or not (user.is_staff or user.is_superuser):
			return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

		startup = self._get_startup(pk)
		if not startup:
			return Response({'error': 'Startup not found'}, status=status.HTTP_404_NOT_FOUND)

		# Validate verification_status if provided
		v_status = request.data.get('verification_status')
		if v_status and v_status not in self.VALID_VERIFICATION_STATUSES:
			return Response(
				{'error': f'Invalid verification_status. Choose from: {", ".join(sorted(self.VALID_VERIFICATION_STATUSES))}'},
				status=status.HTTP_400_BAD_REQUEST
			)

		# Apply editable fields
		update_fields = ['updated_at']
		for field in self.EDITABLE_FIELDS:
			if field in request.data:
				setattr(startup, field, request.data[field])
				update_fields.append(field)

		startup.save(update_fields=update_fields)

		serializer = AdminStartupSerializer(startup)
		return Response({'message': 'Startup updated successfully', 'startup': serializer.data})


class AdminDeleteStartupView(generics.GenericAPIView):
	"""DELETE a single startup (admin only). Removes only the startup record."""
	permission_classes = [AllowAny]

	def delete(self, request, pk):
		user = get_session_user(request)
		if not user or not (user.is_staff or user.is_superuser):
			return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

		try:
			startup = Startup.objects.get(pk=pk)
		except Startup.DoesNotExist:
			return Response({'error': 'Startup not found'}, status=status.HTTP_404_NOT_FOUND)

		title = startup.title
		startup.delete()
		return Response({'message': f'Startup "{title}" has been deleted.'}, status=status.HTTP_200_OK)


class AdminDeleteUserView(generics.GenericAPIView):
	"""DELETE a user and ALL of their associated data (admin only)."""
	permission_classes = [AllowAny]

	def delete(self, request, pk):
		admin = get_session_user(request)
		if not admin or not (admin.is_staff or admin.is_superuser):
			return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

		try:
			target_user = User.objects.get(pk=pk)
		except User.DoesNotExist:
			return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

		# Prevent deleting yourself
		if target_user.id == admin.id:
			return Response({'error': 'You cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)

		username = target_user.username
		# Django CASCADE handles all related data (startups, applications, messages, etc.)
		target_user.delete()
		return Response({'message': f'User "{username}" and all associated data have been deleted.'}, status=status.HTTP_200_OK)
