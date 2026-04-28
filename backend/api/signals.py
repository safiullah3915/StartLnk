from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Application, Favorite, Interest, User, Startup
from .recommendation_models import UserInteraction

import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Application)
def create_apply_interaction(sender, instance, created, **kwargs):
    """Create UserInteraction when Application is created"""
    if created:
        UserInteraction.objects.update_or_create(
            user=instance.applicant,
            startup=instance.startup,
            interaction_type='apply',
            defaults={'position': instance.position, 'weight': 3.0}
        )


@receiver(post_save, sender=Favorite)
def create_favorite_interaction(sender, instance, created, **kwargs):
    """Create UserInteraction when Favorite is created"""
    if created:
        UserInteraction.objects.update_or_create(
            user=instance.user,
            startup=instance.startup,
            interaction_type='favorite',
            defaults={'weight': 2.5}
        )


@receiver(post_save, sender=Interest)
def create_interest_interaction(sender, instance, created, **kwargs):
    """Create UserInteraction when Interest is created"""
    if created:
        UserInteraction.objects.update_or_create(
            user=instance.user,
            startup=instance.startup,
            interaction_type='interest',
            defaults={'weight': 3.5}
        )

