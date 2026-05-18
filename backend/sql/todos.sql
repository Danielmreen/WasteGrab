-- WasteGrab Todo Queries

-- Create table (already created by Prisma migration, but shown for reference)
CREATE TABLE `todos` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `completed` BOOLEAN DEFAULT FALSE,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- SELECT ALL TODOS
SELECT * FROM `todos` ORDER BY `createdAt` DESC;

-- SELECT TODO BY ID
SELECT * FROM `todos` WHERE `id` = '{{id}}';

-- SELECT ALL INCOMPLETE TODOS
SELECT * FROM `todos` WHERE `completed` = FALSE ORDER BY `createdAt` DESC;

-- SELECT ALL COMPLETED TODOS
SELECT * FROM `todos` WHERE `completed` = TRUE ORDER BY `createdAt` DESC;

-- COUNT TODOS
SELECT COUNT(*) as total FROM `todos`;

-- COUNT INCOMPLETE TODOS
SELECT COUNT(*) as incomplete_count FROM `todos` WHERE `completed` = FALSE;

-- COUNT COMPLETED TODOS
SELECT COUNT(*) as completed_count FROM `todos` WHERE `completed` = TRUE;

-- INSERT TODO
INSERT INTO `todos` (`id`, `title`, `completed`, `createdAt`, `updatedAt`)
VALUES (UUID(), '{{title}}', FALSE, NOW(), NOW());

-- UPDATE TODO TITLE
UPDATE `todos` SET `title` = '{{new_title}}', `updatedAt` = NOW()
WHERE `id` = '{{id}}';

-- UPDATE TODO COMPLETION STATUS
UPDATE `todos` SET `completed` = {{completed}}, `updatedAt` = NOW()
WHERE `id` = '{{id}}';

-- UPDATE TODO (title and/or completion)
UPDATE `todos` SET 
  `title` = COALESCE('{{title}}', `title`),
  `completed` = COALESCE({{completed}}, `completed`),
  `updatedAt` = NOW()
WHERE `id` = '{{id}}';

-- DELETE TODO
DELETE FROM `todos` WHERE `id` = '{{id}}';

-- DELETE ALL COMPLETED TODOS
DELETE FROM `todos` WHERE `completed` = TRUE;

-- SEARCH TODOS BY TITLE (case-insensitive)
SELECT * FROM `todos` WHERE `title` LIKE '%{{search_term}}%' ORDER BY `createdAt` DESC;

-- GET TODOS CREATED IN LAST 7 DAYS
SELECT * FROM `todos` WHERE `createdAt` >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY `createdAt` DESC;

-- GET TODOS STATISTICS
SELECT 
  COUNT(*) as total_todos,
  SUM(CASE WHEN `completed` = TRUE THEN 1 ELSE 0 END) as completed_count,
  SUM(CASE WHEN `completed` = FALSE THEN 1 ELSE 0 END) as incomplete_count
FROM `todos`;

-- PAGINATED QUERY (10 items per page, page 1)
SELECT * FROM `todos` ORDER BY `createdAt` DESC LIMIT 10 OFFSET 0;

-- PAGINATED QUERY (10 items per page, page 2)
SELECT * FROM `todos` ORDER BY `createdAt` DESC LIMIT 10 OFFSET 10;
