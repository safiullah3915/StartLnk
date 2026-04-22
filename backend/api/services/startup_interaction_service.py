"""
Startup Interaction Service
Handles startup → user interactions for reverse recommendations
"""
from typing import Optional, Dict, Any
from api.models import Startup
from api.recommendation_models import StartupInteraction


class StartupInteractionService:
    """Service for creating and managing startup interactions"""
    
    @staticmethod
    def create_startup_interaction(
        startup: Startup,
        target_user,
        interaction_type: str,
        recommendation_session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        recommendation_source: Optional[str] = None,
        recommendation_rank: Optional[int] = None,
        recommendation_score: Optional[float] = None,
        recommendation_method: Optional[str] = None
    ) -> StartupInteraction:
        """
        Create a startup interaction record
        
        Args:
            startup: Startup instance
            target_user: User instance (developer or investor)
            interaction_type: Type of interaction ('view', 'click', 'contact', 'apply_received')
            recommendation_session_id: Optional UUID string of recommendation session
            metadata: Optional metadata dict
            recommendation_source: Optional source ('organic' or 'recommendation')
            recommendation_rank: Optional rank in recommendation list
            recommendation_score: Optional recommendation score
            recommendation_method: Optional recommendation method used
            
        Returns:
            StartupInteraction instance
        """
        # Build metadata if not provided
        if metadata is None:
            metadata = {}
        
        # Add recommendation context to metadata if available
        if recommendation_session_id:
            metadata['recommendation_session_id'] = recommendation_session_id
            if recommendation_source is None:
                recommendation_source = 'recommendation'
        
        # Create or update interaction (unique constraint on startup, target_user, interaction_type)
        interaction, created = StartupInteraction.objects.update_or_create(
            startup=startup,
            target_user=target_user,
            interaction_type=interaction_type,
            defaults={
                'recommendation_session_id': recommendation_session_id,
                'recommendation_source': recommendation_source or 'organic',
                'recommendation_rank': recommendation_rank,
                'recommendation_score': recommendation_score,
                'recommendation_method': recommendation_method,
                'metadata': metadata
            }
        )
        
        return interaction
    
    @staticmethod
    def build_interaction_metadata(
        startup: Startup,
        target_user,
        recommendation_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Build metadata dict with startup context
        
        Returns:
            Metadata dict
        """
        metadata = {
            'startup_id': str(startup.id),
            'startup_title': startup.title,
            'target_user_id': str(target_user.id),
            'target_user_username': target_user.username,
        }
        
        if recommendation_context:
            metadata.update({
                'session_id': recommendation_context.get('session_id'),
                'rank': recommendation_context.get('rank'),
                'score': recommendation_context.get('score'),
                'method': recommendation_context.get('method'),
                'source': 'recommendation'
            })
        else:
            metadata['source'] = 'organic'
        
        return metadata
    
    @staticmethod
    def get_weight_for_interaction_type(interaction_type: str) -> float:
        """Get weight for interaction type"""
        weight_mapping = {
            'view': 0.5,
            'click': 1.0,
            'contact': 2.0,
            'apply_received': 3.0,
        }
        return weight_mapping.get(interaction_type, 1.0)
    
    @staticmethod
    def validate_interaction_type(interaction_type: str) -> bool:
        """Validate interaction type"""
        valid_types = ['view', 'click', 'contact', 'apply_received']
        return interaction_type in valid_types
