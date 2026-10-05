-- ====================================================================
-- DBMS COURSE PROJECT: PRESENTATION-II EVALUATION QUERY
-- Student Name: Martala Harsha Vardhan Reddy
-- Student ID  : 25WU0102152
-- Course      : Database Management Systems
-- ====================================================================

-- 1. Assigned Problem Statement / Question:
-- "Retrieve all information about the faculty mentor named Venkat."

-- 2. Query Explanation & Logic:
-- To look up faculty mentor records where the title or full name includes "Venkat"
-- (e.g., Prof. Venkat Raman), the SQL LIKE operator is used with wildcards (%Venkat%).
-- This performs substring pattern matching against the name column of the faculty_mentor table.

-- 3. SQL Query:
SELECT * FROM faculty_mentor WHERE name LIKE "%Venkat%";

-- 4. Live MySQL CLI Execution Output:
-- +------------+--------------------+------------------------+-------------------+
-- | faculty_id | name               | department             | email             |
-- +------------+--------------------+------------------------+-------------------+
-- | F503       | Prof. Venkat Raman | Information Technology | venkat.r@univ.edu |
-- +------------+--------------------+------------------------+-------------------+
-- 1 row in set (0.251 sec)
