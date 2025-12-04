PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`host_id` text NOT NULL,
	`do_id` text NOT NULL,
	`is_open` integer DEFAULT true,
	`updated_at` integer DEFAULT '"2025-12-04T03:22:50.618Z"' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_rooms`("id", "name", "host_id", "do_id", "is_open", "updated_at") SELECT "id", "name", "host_id", "do_id", "is_open", "updated_at" FROM `rooms`;--> statement-breakpoint
DROP TABLE `rooms`;--> statement-breakpoint
ALTER TABLE `__new_rooms` RENAME TO `rooms`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_user_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`room_id` text NOT NULL,
	`updated_at` integer DEFAULT '"2025-12-04T03:22:50.619Z"' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user_rooms`("id", "user_id", "room_id", "updated_at") SELECT "id", "user_id", "room_id", "updated_at" FROM `user_rooms`;--> statement-breakpoint
DROP TABLE `user_rooms`;--> statement-breakpoint
ALTER TABLE `__new_user_rooms` RENAME TO `user_rooms`;--> statement-breakpoint
CREATE INDEX `idx_user_room_id` ON `user_rooms` (`room_id`);--> statement-breakpoint
CREATE INDEX `idx_user_updated_at` ON `user_rooms` (`updated_at`);