CREATE TABLE `user_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`current_room_id` text NOT NULL,
	`is_host` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_rooms_user_id_unique` ON `user_rooms` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_current_room` ON `user_rooms` (`current_room_id`);--> statement-breakpoint
CREATE INDEX `idx_user_updated_at` ON `user_rooms` (`updated_at`);