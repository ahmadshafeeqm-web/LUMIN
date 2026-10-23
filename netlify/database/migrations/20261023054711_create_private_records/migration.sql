CREATE TABLE "records" (
	"user_id" text,
	"key" text,
	"value" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "records_pkey" PRIMARY KEY("user_id","key")
);
