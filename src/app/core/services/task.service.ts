import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { Task, FilterType, TaskPriority } from '../models/task.model';

const STORAGE_KEY = 'ng-tasks';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private filterSubject = new BehaviorSubject<FilterType>('all');
  private searchSubject = new BehaviorSubject<string>('');

  tasks$ = this.tasksSubject.asObservable();
  filter$ = this.filterSubject.asObservable();
  search$ = this.searchSubject.asObservable();

  filteredTasks$: Observable<Task[]> = combineLatest([
    this.tasks$,
    this.filter$,
    this.search$
  ]).pipe(
    map(([tasks, filter, search]) => {
      let result = tasks;

      if (filter === 'active')    result = result.filter(t => !t.completed);
      if (filter === 'completed') result = result.filter(t => t.completed);

      if (search.trim()) {
        const q = search.toLowerCase();
        result = result.filter(
          t => t.title.toLowerCase().includes(q) ||
               t.description.toLowerCase().includes(q)
        );
      }

      return result;
    })
  );

  counts$ = this.tasks$.pipe(
    map(tasks => ({
      all:       tasks.length,
      active:    tasks.filter(t => !t.completed).length,
      completed: tasks.filter(t => t.completed).length
    }))
  );

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.tasksSubject.next(JSON.parse(raw));
    } catch {
      this.tasksSubject.next([]);
    }
  }

  private persist(tasks: Task[]): void {
    this.tasksSubject.next(tasks);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Storage unavailable — state still lives in memory
    }
  }

  getTasks(): Task[] {
    return this.tasksSubject.value;
  }

  getById(id: string): Task | undefined {
    return this.getTasks().find(t => t.id === id);
  }

  addTask(data: { title: string; description: string; priority: TaskPriority; dueDate?: string }): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      title: data.title.trim(),
      description: data.description?.trim() ?? '',
      priority: data.priority,
      dueDate: data.dueDate,
      completed: false,
      createdAt: now,
      updatedAt: now
    };
    this.persist([...this.getTasks(), task]);
    return task;
  }

  updateTask(id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>): void {
    const tasks = this.getTasks().map(t =>
      t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t
    );
    this.persist(tasks);
  }

  deleteTask(id: string): void {
    this.persist(this.getTasks().filter(t => t.id !== id));
  }

  toggleComplete(id: string): void {
    const tasks = this.getTasks().map(t =>
      t.id === id
        ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() }
        : t
    );
    this.persist(tasks);
  }

  setFilter(filter: FilterType): void {
    this.filterSubject.next(filter);
  }

  setSearch(query: string): void {
    this.searchSubject.next(query);
  }
}
