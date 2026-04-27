import time
from typing import Iterable, List, Optional, Set, Tuple

from django.contrib.auth import get_user_model
from django.core.cache import cache

from api.recommendation_models import UserOnboardingPreferences


User = get_user_model()


class PresenceService:
    """
    Cache-backed online presence.

    Redis plugs in by changing Django's CACHES setting to a Redis backend; this
    service intentionally uses only django.core.cache and stores no DB presence
    state.
    """

    TTL_SECONDS = 60
    LAST_SEEN_PREFIX = "user_last_seen"
    REGISTRY_KEY = "online_user_registry"
    REGISTRY_TTL_SECONDS = 60 * 60 * 24

    @classmethod
    def _last_seen_key(cls, user_id) -> str:
        return f"{cls.LAST_SEEN_PREFIX}:{user_id}"

    @classmethod
    def _read_registry(cls) -> Set[str]:
        raw = cache.get(cls.REGISTRY_KEY) or []
        return {str(user_id) for user_id in raw if user_id}

    @classmethod
    def _write_registry(cls, user_ids: Iterable[str]) -> None:
        cache.set(
            cls.REGISTRY_KEY,
            sorted({str(user_id) for user_id in user_ids if user_id}),
            timeout=cls.REGISTRY_TTL_SECONDS,
        )

    @classmethod
    def mark_seen(cls, user) -> float:
        last_seen = time.time()
        user_id = str(user.id)
        cache.set(cls._last_seen_key(user_id), last_seen, timeout=cls.TTL_SECONDS)

        registry = cls._read_registry()
        registry.add(user_id)
        cls._write_registry(registry)
        return last_seen

    @classmethod
    def get_last_seen(cls, user_id) -> Optional[float]:
        value = cache.get(cls._last_seen_key(user_id))
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @classmethod
    def is_online(cls, user_id) -> bool:
        last_seen = cls.get_last_seen(user_id)
        return last_seen is not None and (time.time() - last_seen) <= cls.TTL_SECONDS

    @classmethod
    def get_online_user_ids(cls) -> List[str]:
        """Return online IDs and prune expired registry entries on every read."""
        registry = cls._read_registry()
        online_ids = []

        for user_id in registry:
            if cls.is_online(user_id):
                online_ids.append(user_id)

        cls._write_registry(online_ids)
        return online_ids

    @classmethod
    def _preference_sets_for_users(cls, user_ids: Iterable[str]) -> dict:
        prefs = UserOnboardingPreferences.objects.filter(user_id__in=list(user_ids))
        return {
            str(pref.user_id): (
                set(pref.selected_fields or []),
                set(pref.selected_categories or []),
            )
            for pref in prefs
        }

    @classmethod
    def _requester_preference_sets(cls, user) -> Tuple[Set[str], Set[str]]:
        try:
            pref = user.onboarding_preferences
        except UserOnboardingPreferences.DoesNotExist:
            return set(), set()
        return set(pref.selected_fields or []), set(pref.selected_categories or [])

    @classmethod
    def get_online_users_for_user(cls, requesting_user):
        online_ids = [
            user_id
            for user_id in cls.get_online_user_ids()
            if user_id != str(requesting_user.id)
        ]
        if not online_ids:
            return User.objects.none()

        requester_fields, requester_categories = cls._requester_preference_sets(requesting_user)
        users_qs = User.objects.filter(id__in=online_ids).order_by("username")

        if not requester_fields and not requester_categories:
            return users_qs

        candidate_prefs = cls._preference_sets_for_users(online_ids)
        matching_ids = []
        for user_id, (fields, categories) in candidate_prefs.items():
            if (requester_fields and requester_fields.intersection(fields)) or (
                requester_categories and requester_categories.intersection(categories)
            ):
                matching_ids.append(user_id)

        if not matching_ids:
            return User.objects.none()

        return users_qs.filter(id__in=matching_ids)
