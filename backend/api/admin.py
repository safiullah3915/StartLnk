from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

# ── Core models ───────────────────────────────────────────────────────────────
from .models import (
    User, Startup, StartupTag, Position, Application,
    Notification, Favorite, Interest, Team, TeamMember,
)

# ── Messaging / profile models ────────────────────────────────────────────────
from .messaging_models import (
    Conversation, Message, UserProfile, FileUpload, ProfileView,
)

# ── Recommendation models ─────────────────────────────────────────────────────
from .recommendation_models import (
    UserInteraction, StartupInteraction, UserOnboardingPreferences,
)


# ══════════════════════════════════════════════════════════════════════════════
#  USERS
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'is_active', 'is_staff',
                    'is_superuser', 'email_verified', 'created_at')
    list_filter  = ('is_active', 'email_verified', 'is_staff', 'is_superuser', 'role')
    search_fields = ('username', 'email')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'last_login')

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('username', 'role', 'phone_number')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser',
                                    'email_verified', 'groups', 'user_permissions')}),
        ('Metadata', {'fields': ('id', 'last_login', 'created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2',
                       'role', 'is_staff', 'is_superuser'),
        }),
    )

    def get_fieldsets(self, request, obj=None):
        if not obj:
            return self.add_fieldsets
        return super().get_fieldsets(request, obj)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display  = ('user', 'location', 'is_public', 'views', 'created_at')
    list_filter   = ('is_public',)
    search_fields = ('user__username', 'user__email', 'location')
    ordering      = ('-created_at',)
    readonly_fields = ('views', 'created_at', 'updated_at')


# ══════════════════════════════════════════════════════════════════════════════
#  STARTUPS
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Startup)
class StartupAdmin(admin.ModelAdmin):
    list_display  = ('title', 'owner', 'type', 'category', 'status',
                     'verification_status', 'views', 'created_at')
    list_filter   = ('type', 'category', 'status', 'verification_status',
                     'featured', 'created_at')
    search_fields = ('title', 'description', 'field', 'owner__username', 'owner__email')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'views', 'created_at', 'updated_at')

    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'title', 'role_title', 'description', 'field', 'website_url')
        }),
        ('Classification', {
            'fields': ('type', 'category', 'status', 'verification_status', 'featured')
        }),
        ('Stage & Team', {
            'fields': ('phase', 'team_size', 'earn_through', 'stages')
        }),
        ('Financial Details', {
            'fields': ('revenue', 'profit', 'asking_price',
                       'ttm_revenue', 'ttm_profit',
                       'last_month_revenue', 'last_month_profit'),
            'classes': ('collapse',),
        }),
        ('Metadata', {
            'fields': ('owner', 'views', 'created_at', 'updated_at')
        }),
    )


@admin.register(StartupTag)
class StartupTagAdmin(admin.ModelAdmin):
    list_display  = ('startup', 'tag')
    list_filter   = ('tag',)
    search_fields = ('startup__title', 'tag')


# ══════════════════════════════════════════════════════════════════════════════
#  POSITIONS & APPLICATIONS
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display  = ('title', 'startup', 'is_active', 'created_at')
    list_filter   = ('is_active', 'created_at')
    search_fields = ('title', 'description', 'startup__title')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display  = ('applicant', 'startup', 'position', 'status', 'created_at')
    list_filter   = ('status', 'created_at')
    search_fields = ('applicant__username', 'applicant__email',
                     'startup__title', 'position__title')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')


# ══════════════════════════════════════════════════════════════════════════════
#  MESSAGING
# ══════════════════════════════════════════════════════════════════════════════

class MessageInline(admin.TabularInline):
    model  = Message
    fields = ('sender', 'content', 'message_type', 'is_read', 'is_system', 'created_at')
    readonly_fields = ('sender', 'content', 'message_type', 'is_read',
                       'is_system', 'created_at')
    extra  = 0
    can_delete = True
    show_change_link = True


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display  = ('id', 'title_display', 'participant_list', 'message_count',
                     'is_active', 'created_at')
    list_filter   = ('is_active', 'created_at')
    search_fields = ('title', 'participants__username', 'participants__email')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines       = [MessageInline]
    filter_horizontal = ('participants',)

    def title_display(self, obj):
        return obj.title or '(Direct Message)'
    title_display.short_description = 'Title'

    def participant_list(self, obj):
        names = ', '.join(p.username for p in obj.participants.all()[:4])
        total = obj.participants.count()
        return f"{names}{' …' if total > 4 else ''}"
    participant_list.short_description = 'Participants'

    def message_count(self, obj):
        return obj.messages.count()
    message_count.short_description = 'Messages'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display  = ('sender', 'conversation', 'short_content', 'message_type',
                     'is_read', 'is_system', 'created_at')
    list_filter   = ('message_type', 'is_read', 'is_system', 'created_at')
    search_fields = ('content', 'sender__username', 'sender__email')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at')

    def short_content(self, obj):
        return obj.content[:80] + ('…' if len(obj.content) > 80 else '')
    short_content.short_description = 'Content'


# ══════════════════════════════════════════════════════════════════════════════
#  TEAMS
# ══════════════════════════════════════════════════════════════════════════════

class TeamMemberInline(admin.TabularInline):
    model  = TeamMember
    fields = ('user', 'role', 'joined_at')
    readonly_fields = ('joined_at',)
    extra  = 0


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display  = ('name', 'startup', 'created_by', 'member_count', 'created_at')
    search_fields = ('name', 'startup__title', 'created_by__username')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines       = [TeamMemberInline]

    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = 'Members'


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display  = ('user', 'team', 'role', 'joined_at')
    list_filter   = ('role',)
    search_fields = ('user__username', 'team__name')
    ordering      = ('-joined_at',)
    readonly_fields = ('id', 'joined_at')


# ══════════════════════════════════════════════════════════════════════════════
#  NOTIFICATIONS, FAVORITES, INTERESTS
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ('user', 'short_message', 'notification_type',
                     'is_read', 'created_at')
    list_filter   = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__username', 'message')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at')

    def short_message(self, obj):
        return obj.message[:70] + ('…' if len(obj.message) > 70 else '')
    short_message.short_description = 'Message'


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display  = ('user', 'startup', 'created_at')
    search_fields = ('user__username', 'startup__title')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at')


@admin.register(Interest)
class InterestAdmin(admin.ModelAdmin):
    list_display  = ('user', 'startup', 'message_preview', 'created_at')
    search_fields = ('user__username', 'startup__title')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at')

    def message_preview(self, obj):
        return (obj.message or '')[:60]
    message_preview.short_description = 'Message'


# ══════════════════════════════════════════════════════════════════════════════
#  FILE UPLOADS
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(FileUpload)
class FileUploadAdmin(admin.ModelAdmin):
    list_display  = ('user', 'original_name', 'file_type', 'file_size_kb',
                     'is_active', 'created_at')
    list_filter   = ('file_type', 'is_active', 'created_at')
    search_fields = ('user__username', 'original_name')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at')

    def file_size_kb(self, obj):
        return f"{round(obj.file_size / 1024, 1)} KB"
    file_size_kb.short_description = 'Size'


# ══════════════════════════════════════════════════════════════════════════════
#  RECOMMENDATION / INTERACTION MODELS
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(UserOnboardingPreferences)
class UserOnboardingPreferencesAdmin(admin.ModelAdmin):
    list_display  = ('user', 'onboarding_completed', 'created_at')
    list_filter   = ('onboarding_completed',)
    search_fields = ('user__username', 'user__email')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(UserInteraction)
class UserInteractionAdmin(admin.ModelAdmin):
    list_display  = ('user', 'startup', 'interaction_type', 'created_at')
    list_filter   = ('interaction_type', 'created_at')
    search_fields = ('user__username', 'startup__title')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at')


@admin.register(StartupInteraction)
class StartupInteractionAdmin(admin.ModelAdmin):
    list_display  = ('startup', 'indicator', 'created_at')
    list_filter   = ('created_at',)
    search_fields = ('startup__title', 'indicator')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at')
