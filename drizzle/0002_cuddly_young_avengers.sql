CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`do_id` text,
	`updated_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`room_id` text NOT NULL,
	`is_host` integer DEFAULT false NOT NULL,
	`updated_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user_rooms`("id", "user_id", "room_id", "is_host", "updated_at") SELECT "id", "user_id", "room_id", "is_host", "updated_at" FROM `user_rooms`;--> statement-breakpoint
DROP TABLE `user_rooms`;--> statement-breakpoint
ALTER TABLE `__new_user_rooms` RENAME TO `user_rooms`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_rooms_user_id_unique` ON `user_rooms` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_room_id` ON `user_rooms` (`room_id`);--> statement-breakpoint
CREATE INDEX `idx_user_updated_at` ON `user_rooms` (`updated_at`);