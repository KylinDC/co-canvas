ALTER TABLE `rooms` ADD `host_id` text NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `is_open` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `user_rooms` DROP COLUMN `is_host`;