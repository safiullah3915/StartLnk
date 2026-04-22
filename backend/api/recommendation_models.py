import uuid
from django.db import models
from django.utils import timezone


class UserInteraction(models.Model):
    """Unified interaction tracking for recommendation system"""
    INTERACTION_TYPE_CHOICES = [
        ('view', 'View'),
        ('click', 'Click'),
        ('like', 'Like'),
        ('dislike', 'Dislike'),
        ('favorite', 'Favorite'),
        ('apply', 'Apply'),
        ('interest', 'Interest'),
    ]
    
    # Weight mapping (computed on save via signal or save() override):
    # 'view': 0.5
    # 'click': 1.0
    # 'like': 2.0
    # 'dislike': -1.0 (negative signal)
    # 'favorite': 2.5
    # 'apply': 3.0
    # 'interest': 3.5
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('api.User', on_delete=models.CASCADE, related_name='interactions', db_column='user_id')
    startup = models.ForeignKey('api.Startup', on_delete=models.CASCADE, related_name='interactions', db_column='startup_id')
    interaction_type = models.CharField(max_length=30, choices=INTERACTION_TYPE_CHOICES)
    
    # Optional: Track which position if applicable (for analytics only)
    position = models.ForeignKey('api.Position', on_delete=models.SET_NULL, null=True, blank=True, db_column='position_id')
    
    # Precomputed weight for training (calculated on save)
    weight = models.FloatField(default=1.0)
    value_score = models.FloatField(default=0.0, db_index=True)
    
    # Recommendation context (extracted from metadata for analytics/perf)
    recommendation_session_id = models.UUIDField(
        null=True,
        blank=True,
        db_column='recommendation_session_id',
    )
    recommendation_source = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=[('organic', 'Organic'), ('recommendation', 'Recommendation')],
        db_index=True
    )
    recommendation_rank = models.IntegerField(null=True, blank=True)
    recommendation_score = models.FloatField(null=True, blank=True)
    recommendation_method = models.CharField(max_length=50, null=True, blank=True)
    
    # Additional context
    metadata = models.JSONField(default=dict, blank=True)  # session_id, device, etc.
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_interactions'
        indexes = [
            models.Index(fields=['user', 'startup', 'created_at']),
            models.Index(fields=['startup', 'created_at']),
            models.Index(fields=['interaction_type']),
            models.Index(fields=['position']),
            # ETL-optimized index for date-range queries
            models.Index(fields=['created_at', 'interaction_type']),
            models.Index(fields=['recommendation_session_id', 'created_at'], name='idx_interaction_session_time'),
            models.Index(fields=['recommendation_source', 'created_at'], name='idx_interaction_source_time'),
            models.Index(fields=['user', 'interaction_type', 'created_at'], name='idx_interaction_user_type_time'),
        ]
        # Unique constraint to prevent duplicate interactions of same type
        # Allows multiple interactions of different types, but only one per type per user-startup pair
        unique_together = [['user', 'startup', 'interaction_type']]
    
    def save(self, *args, **kwargs):
        # Calculate weight based on interaction type
        weight_mapping = {
            'view': 0.5,
            'click': 1.0,
            'like': 2.0,
            'dislike': -1.0,
            'favorite': 2.5,
            'apply': 3.0,
            'interest': 3.5,
        }
        self.weight = weight_mapping.get(self.interaction_type, 1.0)
        super().save(*args, **kwargs)
    
    def get_metadata_value(self, key: str, default=None):
        """Helper to safely get metadata value"""
        if isinstance(self.metadata, dict):
            return self.metadata.get(key, default)
        return default
    
    def is_recommendation_interaction(self) -> bool:
        """Check if interaction is from recommendation"""
        return self.get_metadata_value('source') == 'recommendation'
    
    def get_recommendation_session_id(self) -> str:
        """Get recommendation session ID if exists"""
        return self.get_metadata_value('recommendation_session_id')
    
    def get_recommendation_rank(self) -> int:
        """Get recommendation rank if exists"""
        return self.get_metadata_value('recommendation_rank')
    
    def __str__(self):
        return f"{self.user.username} - {self.interaction_type} - {self.startup.title}"


class StartupInteraction(models.Model):
    """Interaction tracking for reverse recommendations (startup → developer/investor)"""
    INTERACTION_TYPE_CHOICES = [
        ('view', 'View'),
        ('click', 'Click'),
        ('contact', 'Contact'),
        ('apply_received', 'Apply Received'),
    ]
    
    # Weight mapping (computed on save):
    # 'view': 0.5
    # 'click': 1.0
    # 'contact': 2.0
    # 'apply_received': 3.0
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    startup = models.ForeignKey('api.Startup', on_delete=models.CASCADE, related_name='startup_interactions', db_column='startup_id')
    target_user = models.ForeignKey('api.User', on_delete=models.CASCADE, related_name='received_startup_interactions', db_column='target_user_id')
    interaction_type = models.CharField(max_length=30, choices=INTERACTION_TYPE_CHOICES)
    
    # Recommendation context (extracted from metadata for analytics/perf)
    recommendation_session_id = models.UUIDField(
        null=True,
        blank=True,
        db_column='recommendation_session_id',
    )
    recommendation_source = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=[('organic', 'Organic'), ('recommendation', 'Recommendation')],
        db_index=True
    )
    recommendation_rank = models.IntegerField(null=True, blank=True)
    recommendation_score = models.FloatField(null=True, blank=True)
    recommendation_method = models.CharField(max_length=50, null=True, blank=True)
    
    # Precomputed weight for training (calculated on save)
    weight = models.FloatField(default=1.0)
    
    # Additional context
    metadata = models.JSONField(default=dict, blank=True)  # session_id, device, etc.
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'startup_interactions'
        indexes = [
            models.Index(fields=['startup', 'target_user', 'created_at']),
            models.Index(fields=['startup', 'created_at']),
            models.Index(fields=['target_user', 'created_at']),
            models.Index(fields=['interaction_type']),
            # ETL-optimized index for date-range queries
            models.Index(fields=['created_at', 'interaction_type']),
            models.Index(fields=['recommendation_session_id', 'created_at'], name='idx_startup_int_session_time'),
            models.Index(fields=['recommendation_source', 'created_at'], name='idx_startup_int_source_time'),
            models.Index(fields=['startup', 'interaction_type', 'created_at'], name='idx_startup_int_type_time'),
        ]
        # Unique constraint to prevent duplicate interactions of same type
        unique_together = [['startup', 'target_user', 'interaction_type']]
    
    def save(self, *args, **kwargs):
        # Calculate weight based on interaction type
        weight_mapping = {
            'view': 0.5,
            'click': 1.0,
            'contact': 2.0,
            'apply_received': 3.0,
        }
        self.weight = weight_mapping.get(self.interaction_type, 1.0)
        super().save(*args, **kwargs)
    
    def get_metadata_value(self, key: str, default=None):
        """Helper to safely get metadata value"""
        if isinstance(self.metadata, dict):
            return self.metadata.get(key, default)
        return default
    
    def is_recommendation_interaction(self) -> bool:
        """Check if interaction is from recommendation"""
        return self.get_metadata_value('source') == 'recommendation'
    
    def get_recommendation_session_id(self) -> str:
        """Get recommendation session ID if exists"""
        return self.get_metadata_value('recommendation_session_id')
    
    def get_recommendation_rank(self) -> int:
        """Get recommendation rank if exists"""
        return self.get_metadata_value('recommendation_rank')
    
    def __str__(self):
        return f"{self.startup.title} - {self.interaction_type} - {self.target_user.username}"


class UserOnboardingPreferences(models.Model):
    """Initial user preferences for cold-start recommendations"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        'api.User',
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='onboarding_preferences'
    )
    
    # Selected categories (from startup.category choices)
    selected_categories = models.JSONField(default=list, blank=True)  # e.g., ['saas', 'ecommerce', 'web3']
    
    # Selected fields (from startup.field)
    selected_fields = models.JSONField(default=list, blank=True)  # e.g., ['fintech', 'healthcare', 'education']
    
    # Selected tags (from startup_tags.tag)
    selected_tags = models.JSONField(default=list, blank=True)  # e.g., ['AI', 'blockchain', 'mobile']
    
    # Preferred startup stages (from startup.stages)
    preferred_startup_stages = models.JSONField(default=list, blank=True)  # e.g., ['early', 'growth', 'mature']
    
    # Preferred engagement types (for developers)
    preferred_engagement_types = models.JSONField(default=list, blank=True)  # e.g., ['full-time', 'part-time', 'equity', 'paid']
    
    # Preferred skills (for developers - skills they want to work with)
    preferred_skills = models.JSONField(default=list, blank=True)  # e.g., ['Python', 'React', 'Machine Learning']
    
    # Investor specific structured payload (mirrors serializer schema)
    investor_profile = models.JSONField(default=dict, blank=True)
    
    onboarding_completed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_onboarding_preferences'
        indexes = [
            models.Index(fields=['user']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - Onboarding Preferences"


    def __str__(self):
        return f"{self.user.username} - Onboarding Preferences"

