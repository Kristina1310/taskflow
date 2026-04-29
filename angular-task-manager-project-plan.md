# 🧠 Angular Task Manager (Professional Project Plan)

## 📌 Overview

This project is a **Task Manager web application** built with Angular.  
The goal is to demonstrate core Angular features using a **clean, scalable, and professional architecture**.

The application will allow users to create, manage, and track tasks with a modern UI.

---

## 🧱 Architecture

The project follows a **feature-based architecture**, similar to production Angular apps.

### Layers:

* **Core** -> singleton services, models, interceptors
* **Shared** -> reusable UI components, pipes, directives
* **Features** -> domain logic (tasks)
* **Layout** -> structural UI (navbar, sidebar)

---

## 📁 Folder Structure

```bash
src/
└── app/
    ├── core/
    │   ├── services/
    │   │   └── task.service.ts
    │   ├── models/
    │   │   └── task.model.ts
    │   └── interceptors/
    │
    ├── shared/
    │   ├── components/
    │   │   ├── button/
    │   │   └── modal/
    │   ├── pipes/
    │   └── directives/
    │
    ├── features/
    │   └── tasks/
    │       ├── pages/
    │       │   ├── task-list/
    │       │   └── task-detail/
    │       │
    │       ├── components/
    │       │   ├── task-item/
    │       │   ├── task-form/
    │       │   └── task-filter/
    │       │
    │       ├── tasks-routing.module.ts
    │       └── tasks.module.ts
    │
    ├── layout/
    │   ├── navbar/
    │   └── sidebar/
    │
    ├── app-routing.module.ts
    └── app.component.ts
```

---

## ⚙️ Features

### ✅ Core Functionality

* Create task
* Edit task
* Delete task
* Mark task as completed

### 🔍 Filtering

* All tasks
* Completed tasks
* Active tasks

### 📄 Task Details

* View full task information

---

## 🧠 Angular Concepts to Demonstrate

* Components (smart & dumb separation)
* Services (TaskService)
* Routing + Lazy Loading
* Reactive Forms
* Input / Output communication
* Pipes (for formatting)
* LocalStorage persistence

### ⭐ Bonus (for higher grade)

* Route Guards
* HTTP Interceptor
* State management via BehaviorSubject

---

## 🧠 State Management (IMPORTANT)

Use **BehaviorSubject inside TaskService** to manage state reactively.

### Concept:

* Keep tasks in a private BehaviorSubject
* Expose observable (tasks$)
* Update state via methods

### Example Implementation:

```ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  tasks$ = this.tasksSubject.asObservable();

  constructor() {
    const stored = localStorage.getItem('tasks');
    if (stored) {
      this.tasksSubject.next(JSON.parse(stored));
    }
  }

  private updateState(tasks: Task[]) {
    this.tasksSubject.next(tasks);
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  getTasks() {
    return this.tasksSubject.value;
  }

  addTask(task: Task) {
    const tasks = [...this.getTasks(), task];
    this.updateState(tasks);
  }

  updateTask(updatedTask: Task) {
    const tasks = this.getTasks().map(t =>
      t.id === updatedTask.id ? updatedTask : t
    );
    this.updateState(tasks);
  }

  deleteTask(id: string) {
    const tasks = this.getTasks().filter(t => t.id !== id);
    this.updateState(tasks);
  }

  toggleComplete(id: string) {
    const tasks = this.getTasks().map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    this.updateState(tasks);
  }
}
```

---

## 🎨 UI/UX Design

### Design Style

* Minimalistic
* Clean spacing
* Rounded corners
* Soft shadows
* Modern dashboard feel (Notion / Todoist inspired)

---

## 🧩 Layout Structure

* Sidebar (navigation)
* Top Navbar
* Main Content Area
* Floating Add Task Button

---

## 🎨 Styling with Tailwind CSS

### Installation Steps

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init
```

### tailwind.config.js

```js
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### styles.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 🎨 UI Guidelines

### Task Card

* White background
* Rounded-xl
* Shadow-md
* Padding

### Buttons

* Primary: blue
* Danger: red
* Rounded-lg

### Example Tailwind Classes

```html
<div class="bg-white shadow-md rounded-xl p-4 flex justify-between items-center">
  <span class="font-medium">Task title</span>
  <button class="text-red-500">Delete</button>
</div>
```

---

## 🔌 Installation

```bash
npm install
ng serve
```

---

## 🚀 Future Improvements (Bonus)

* Authentication (login/register)
* Dark mode toggle
* Drag & drop tasks
* Backend API integration
* Pagination

---

## 📦 Deliverables

* GitHub repository
* README.md
* Fully working Angular app

---

## 🎯 Goal

The goal is NOT complexity, but to clearly demonstrate:

* Angular architecture
* Clean code structure
* Reactive programming
* Modern UI
