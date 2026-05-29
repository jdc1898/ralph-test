# Add a user activity log to the dashboard

## Tasks

- [x] Create `app/Livewire/ActivityLog.php` Livewire component with 10 hardcoded entries each containing a timestamp, description string, and type field (login/update/delete)
- [x] Create `resources/views/livewire/activity-log.blade.php` with a "Recent Activity" heading, listing all 10 entries styled by type using Flux UI components and Tailwind CSS (green for login, blue for update, red for delete)
- [ ] Add `<livewire:activity-log />` to `resources/views/dashboard.blade.php` below the existing dashboard content
