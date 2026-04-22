from api.recommendation_models import UserInteraction
from django.utils import timezone
from typing import Optional, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class InteractionService:
    """Service for handling user interactions with recommendation context"""
    
    @staticmethod
    def build_interaction_metadata(
        recommendation_session_id: Optional[str] = None,
        recommendation_rank: Optional[int] = None,
        user_id: Optional[str] = None,
        **additional_context
    ) -> Tuple[Dict, Dict]:
        """
        Build standardized metadata for interaction
        This ensures consistent structure for ETL extraction
        """
        metadata = {}
        extracted_context = {
            'recommendation_session_id': None,
            'recommendation_source': None,
            'recommendation_rank': None,
            'recommendation_score': None,
            'recommendation_method': None,
        }
        
        if recommendation_session_id:
            # We no longer verify session object since RecommendationSession model is deleted.
            # We simply store the ID for historical/future training record consistency.
            metadata['source'] = 'recommendation'
            metadata['recommendation_session_id'] = recommendation_session_id
            
            extracted_context.update({
                'recommendation_session_id': recommendation_session_id,
                'recommendation_source': 'recommendation',
            })
            
            if recommendation_rank:
                metadata['recommendation_rank'] = int(recommendation_rank)
                extracted_context['recommendation_rank'] = int(recommendation_rank)
        else:
            # No recommendation context - organic interaction
            metadata['source'] = 'organic'
            extracted_context['recommendation_source'] = 'organic'
        
        # Add additional context (device, referrer, etc.)
        metadata.update(additional_context)
        
        return metadata, extracted_context
    
    @staticmethod
    def create_interaction(
        user,
        startup,
        interaction_type: str,
        metadata: Dict,
        position=None,
        recommendation_context: Optional[Dict] = None
    ) -> Tuple[UserInteraction, bool]:
        """Create interaction with standardized metadata"""
        from django.db import IntegrityError
        
        try:
            defaults = {
                'metadata': metadata,
                'position': position,
            }
            if recommendation_context:
                defaults.update({
                    'recommendation_session_id': recommendation_context.get('recommendation_session_id'),
                    'recommendation_source': recommendation_context.get('recommendation_source'),
                    'recommendation_rank': recommendation_context.get('recommendation_rank'),
                    'recommendation_score': recommendation_context.get('recommendation_score'),
                    'recommendation_method': recommendation_context.get('recommendation_method'),
                })
            interaction, created = UserInteraction.objects.get_or_create(
                user=user,
                startup=startup,
                interaction_type=interaction_type,
                defaults=defaults
            )
            
            # Update metadata if interaction already existed
            if not created:
                interaction.metadata = metadata
                if position:
                    interaction.position = position
                if recommendation_context:
                    interaction.recommendation_session_id = recommendation_context.get('recommendation_session_id')
                    interaction.recommendation_source = recommendation_context.get('recommendation_source')
                    interaction.recommendation_rank = recommendation_context.get('recommendation_rank')
                    interaction.recommendation_score = recommendation_context.get('recommendation_score')
                    interaction.recommendation_method = recommendation_context.get('recommendation_method')
                    fields = ['metadata', 'position', 'recommendation_session_id', 'recommendation_source', 'recommendation_rank', 'recommendation_score', 'recommendation_method']
                else:
                    fields = ['metadata', 'position']
                interaction.save(update_fields=fields)
            
            return interaction, created
        except IntegrityError:
            # Race condition: fetch existing
            interaction = UserInteraction.objects.get(
                user=user,
                startup=startup,
                interaction_type=interaction_type
            )
            interaction.metadata = metadata
            update_fields = ['metadata']
            if position:
                interaction.position = position
                update_fields.append('position')
            if recommendation_context:
                interaction.recommendation_session_id = recommendation_context.get('recommendation_session_id')
                interaction.recommendation_source = recommendation_context.get('recommendation_source')
                interaction.recommendation_rank = recommendation_context.get('recommendation_rank')
                interaction.recommendation_score = recommendation_context.get('recommendation_score')
                interaction.recommendation_method = recommendation_context.get('recommendation_method')
                update_fields.extend([
                    'recommendation_session_id',
                    'recommendation_source',
                    'recommendation_rank',
                    'recommendation_score',
                    'recommendation_method',
                ])
            interaction.save(update_fields=update_fields)
            return interaction, False
