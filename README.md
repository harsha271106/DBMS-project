# Internship Application and Progress Monitoring System
**Course:** Database Management Systems  
**Institution:** School of Technology, Woxsen University  
**Student Name:** Martala Harsha Vardhan Reddy  
**Student ID:** 25WU0102152  
**Faculty Guide:** Dr. Kiran Mayee  

---

## 📌 Project Overview
A complete three-tier relational database management web application designed to transition student internship tracking and milestone evaluation from unnormalized flat spreadsheets into an ACID-compliant, 3NF relational schema.

### Tech Stack:
- **Database Engine:** MySQL 8.0 (InnoDB engine with foreign key cascading)
- **Backend Application Tier:** Node.js & Express.js (REST APIs, connection pooling via `mysql2/promise`)
- **Frontend Presentation Tier:** Semantic HTML5, CSS Grid/Flexbox, ES6+ JavaScript
- **Security:** Dual-mode RBAC (Viewer Mode vs. Owner Mode with `requireOwner` server middleware)

---

## 📁 Repository Structure
Per the course submission guidelines, the repository is organized into four core modules:

- `/Presentation-I`: Problem description presentation slides.
- `/Presentation-II`: Presentation-II slides, ER diagram image, complete `.sql` database schema and data seed script, and Presentation-II query solution.
- `/Presentation-III`: Working UI application code (`server.js`, `db.js`, `public/`), dependencies, and high-resolution UI verification screenshots (Viewer mode, Insert/Delete before & after states, and Live Search).
- `/Project-Report`: Final compiled comprehensive project report in PDF format.

---

## ⚙️ Local Setup & Execution Instructions

### 1. Database Setup
1. Launch MySQL CLI or MySQL Workbench:
   ```bash
   mysql -u root -p
