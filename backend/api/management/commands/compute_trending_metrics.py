from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import math
from api.models import Startup
from api.recommendation_models import UserInteraction, StartupTrendingMetrics

MIN_VIEWS_7D = 1  # Lowered from 3 to allow startups with at least 1 view to have trending scores
MIN_ACTIVITY_7D = 5


def normalize(value, max_value=1):
    """Normalize value between 0 and 1"""
    if max_value == 0:
        return 0.0
    return min(value / max_value, 1.0)


class Command(BaseCommand):
    help = 'Compute trending metrics for all active startups'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Computing trending metrics...'))
        
        now = timezone.now()
        cutoff_24h = now - timedelta(hours=24)
        cutoff_7d = now - timedelta(days=7)
        cutoff_14d = now - timedelta(days=14)
        cutoff_30d = now - timedelta(days=30)
        
        startups = Startup.objects.filter(status='active')
        total = startups.count()
        processed = 0
        
        # First pass: Collect all interaction counts to find global maximums
        all_metrics = []
        for startup in startups:
            interactions_30d = UserInteraction.objects.filter(
                startup=startup,
                created_at__gte=cutoff_30d
            )
            interactions_7d = interactions_30d.filter(created_at__gte=cutoff_7d)
            interactions_24h = interactions_7d.filter(created_at__gte=cutoff_24h)
            interactions_prev_7d = interactions_30d.filter(created_at__lt=cutoff_7d, created_at__gte=cutoff_14d)
            
            view_count_24h = interactions_24h.filter(interaction_type='view').count()
            view_count_7d = interactions_7d.filter(interaction_type='view').count()
            view_count_30d = interactions_30d.filter(interaction_type='view').count()
            
            application_count_24h = interactions_24h.filter(interaction_type='apply').count()
            application_count_7d = interactions_7d.filter(interaction_type='apply').count()
            application_count_30d = interactions_30d.filter(interaction_type='apply').count()
            
            favorite_count_7d = interactions_7d.filter(interaction_type='favorite').count()
            favorite_count_30d = interactions_30d.filter(interaction_type='favorite').count()
            interest_count_7d = interactions_7d.filter(interaction_type='interest').count()
            interest_count_30d = interactions_30d.filter(interaction_type='interest').count()
            favorite_count_prev_7d = interactions_prev_7d.filter(interaction_type='favorite').count()
            interest_count_prev_7d = interactions_prev_7d.filter(interaction_type='interest').count()
            view_count_prev_7d = interactions_prev_7d.filter(interaction_type='view').count()
            application_count_prev_7d = interactions_prev_7d.filter(interaction_type='apply').count()
            
            all_metrics.append({
                'startup': startup,
                'view_count_24h': view_count_24h,
                'view_count_7d': view_count_7d,
                'view_count_30d': view_count_30d,
                'application_count_24h': application_count_24h,
                'application_count_7d': application_count_7d,
                'application_count_30d': application_count_30d,
                'favorite_count_7d': favorite_count_7d,
                'favorite_count_30d': favorite_count_30d,
                'interest_count_7d': interest_count_7d,
                'interest_count_30d': interest_count_30d,
                'view_count_prev_7d': view_count_prev_7d,
                'application_count_prev_7d': application_count_prev_7d,
                'favorite_count_prev_7d': favorite_count_prev_7d,
                'interest_count_prev_7d': interest_count_prev_7d,
            })
        
        # Find global maximums across all startups
        if all_metrics:
            max_views_30d = max([m['view_count_30d'] for m in all_metrics], default=1)
            max_apps_30d = max([m['application_count_30d'] for m in all_metrics], default=1)
            max_favs_30d = max([m['favorite_count_30d'] for m in all_metrics], default=1)
            max_ints_30d = max([m['interest_count_30d'] for m in all_metrics], default=1)
            max_views_7d = max([m['view_count_7d'] for m in all_metrics], default=1)
            max_apps_7d = max([m['application_count_7d'] for m in all_metrics], default=1)
            max_engagement_7d = max([m['favorite_count_7d'] + m['interest_count_7d'] for m in all_metrics], default=1)
        else:
            max_views_30d = max_apps_30d = max_favs_30d = max_ints_30d = 1
            max_views_7d = max_apps_7d = max_engagement_7d = 1
        
        # Second pass: Calculate scores and collect updates
        metrics_to_update = []
        metrics_to_create = []

        # Fetch all existing metrics in one query
        existing_metrics = {
            m.startup_id: m
            for m in StartupTrendingMetrics.objects.filter(
                startup__in=[m['startup'] for m in all_metrics]
            )
        }

        for metrics_data in all_metrics:
            startup = metrics_data['startup']
            view_count_24h = metrics_data['view_count_24h']
            view_count_7d = metrics_data['view_count_7d']
            view_count_30d = metrics_data['view_count_30d']
            application_count_24h = metrics_data['application_count_24h']
            application_count_7d = metrics_data['application_count_7d']
            application_count_30d = metrics_data['application_count_30d']
            favorite_count_7d = metrics_data['favorite_count_7d']
            favorite_count_30d = metrics_data['favorite_count_30d']
            interest_count_7d = metrics_data['interest_count_7d']
            interest_count_30d = metrics_data['interest_count_30d']
            view_count_prev_7d = metrics_data['view_count_prev_7d']
            application_count_prev_7d = metrics_data['application_count_prev_7d']
            favorite_count_prev_7d = metrics_data['favorite_count_prev_7d']
            interest_count_prev_7d = metrics_data['interest_count_prev_7d']

            # Count active positions
            active_positions_count = startup.positions.filter(is_active=True).count()

            # Compute popularity score
            def log_normalize(value, max_value):
                if max_value == 0 or value == 0:
                    return 0.0
                return math.log(1 + value) / math.log(1 + max_value)

            popularity_score = (
                0.25 * log_normalize(view_count_30d, max_views_30d) +
                0.35 * log_normalize(application_count_30d, max_apps_30d) +
                0.25 * log_normalize(favorite_count_30d, max_favs_30d) +
                0.15 * log_normalize(interest_count_30d, max_ints_30d)
            )
            popularity_score = min(popularity_score, 1.0)

            trending_score = (
                0.40 * log_normalize(view_count_7d, max_views_7d) +
                0.30 * log_normalize(application_count_7d, max_apps_7d) +
                0.30 * log_normalize(favorite_count_7d + interest_count_7d, max_engagement_7d)
            )

            activity_7d = view_count_7d + application_count_7d + favorite_count_7d + interest_count_7d
            activity_prev_7d = (
                view_count_prev_7d +
                application_count_prev_7d +
                favorite_count_prev_7d +
                interest_count_prev_7d
            )
            velocity_score = activity_7d / max(activity_prev_7d, 1)

            if activity_7d < MIN_ACTIVITY_7D:
                velocity_score = 0.0

            velocity_boost = min(velocity_score, 2.0) * 0.25
            trending_score = trending_score * (1 + velocity_boost)
            trending_score = min(trending_score, 1.0)

            if view_count_7d < MIN_VIEWS_7D:
                trending_score = 0.0

            fields = {
                'popularity_score': popularity_score,
                'trending_score': trending_score,
                'view_count_24h': view_count_24h,
                'view_count_7d': view_count_7d,
                'view_count_30d': view_count_30d,
                'application_count_24h': application_count_24h,
                'application_count_7d': application_count_7d,
                'application_count_30d': application_count_30d,
                'favorite_count_7d': favorite_count_7d,
                'interest_count_7d': interest_count_7d,
                'active_positions_count': active_positions_count,
                'velocity_score': velocity_score,
            }

            if startup.id in existing_metrics:
                obj = existing_metrics[startup.id]
                for k, v in fields.items():
                    setattr(obj, k, v)
                metrics_to_update.append(obj)
            else:
                metrics_to_create.append(StartupTrendingMetrics(startup=startup, **fields))

            processed += 1
            if processed % 10 == 0:
                self.stdout.write(f'Processed {processed}/{total} startups...')

        # Single bulk write — acquires lock once instead of 225 times
        update_fields = [
            'popularity_score', 'trending_score',
            'view_count_24h', 'view_count_7d', 'view_count_30d',
            'application_count_24h', 'application_count_7d', 'application_count_30d',
            'favorite_count_7d', 'interest_count_7d',
            'active_positions_count', 'velocity_score',
        ]
        if metrics_to_update:
            StartupTrendingMetrics.objects.bulk_update(metrics_to_update, update_fields, batch_size=100)
        if metrics_to_create:
            StartupTrendingMetrics.objects.bulk_create(metrics_to_create, batch_size=100, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS(f'Computed metrics for {processed} startups'))

