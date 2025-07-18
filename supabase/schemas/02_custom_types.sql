CREATE TYPE "public"."billing_provider" AS ENUM (
    'stripe',
    'paddle',
    'custom'
);
ALTER TYPE "public"."billing_provider" OWNER TO "postgres";

CREATE TYPE "public"."metrics_capture_type" AS ENUM (
    'realtime',
    'daily'
);
ALTER TYPE "public"."metrics_capture_type" OWNER TO "postgres";
COMMENT ON TYPE "public"."metrics_capture_type" IS 'Distinguishes between realtime and daily metric collection';

CREATE TYPE "public"."onboarding_status" AS ENUM (
    'pending',
    'creating_team',
    'invited',
    'completed'
);
ALTER TYPE "public"."onboarding_status" OWNER TO "postgres";

CREATE TYPE "public"."platform" AS ENUM (
    'youtube',
    'rumble',
    'twitch',
    'kick'
);
ALTER TYPE "public"."platform" OWNER TO "postgres";

CREATE TYPE "public"."provider" AS ENUM (
    'facebook',
    'instagram',
    'x',
    'ga4',
    'youtube'
);
ALTER TYPE "public"."provider" OWNER TO "postgres";

CREATE TYPE "public"."stream_media_type" AS ENUM (
    'livestream',
    'video'
);
ALTER TYPE "public"."stream_media_type" OWNER TO "postgres";
COMMENT ON TYPE "public"."stream_media_type" IS 'Distinguishes between livestreams and regular videos';

CREATE TYPE "public"."subscription_status" AS ENUM (
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'trialing',
    'unpaid'
);
ALTER TYPE "public"."subscription_status" OWNER TO "postgres";

CREATE TYPE "public"."subscription_tier" AS ENUM (
    'free',
    'pro',
    'premium',
    'enterprise',
    'unlimited',
    'ultimate'
);
ALTER TYPE "public"."subscription_tier" OWNER TO "postgres";

CREATE TYPE "public"."safety_status" AS ENUM (
    'pending', 
    'clean', 
    'suspicious', 
    'blocked'
);
ALTER TYPE "public"."safety_status" OWNER TO "postgres";

-- Custom domain verification status for short-link custom domains
CREATE TYPE "public"."domain_status" AS ENUM (
    'pending',
    'verified',
    'failed'
);
ALTER TYPE "public"."domain_status" OWNER TO "postgres";
COMMENT ON TYPE "public"."domain_status" IS 'Verification status of custom short-link domains';

CREATE TYPE "public"."transcription_status" AS ENUM (
    'pending',
    'completed',
    'failed'
);
ALTER TYPE "public"."transcription_status" OWNER TO "postgres";
COMMENT ON TYPE "public"."transcription_status" IS 'Status of transcription processing for ended streams';

-- Create processing mode enum
CREATE TYPE "public"."processing_mode" AS ENUM ('realtime', 'end_of_stream');
ALTER TYPE "public"."processing_mode" OWNER TO "postgres";
COMMENT ON TYPE "public"."processing_mode" IS 'Processing mode for stream transcriptions';
