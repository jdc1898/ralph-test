<?php

namespace App\Livewire;

use Livewire\Component;

class ActivityLog extends Component
{
    public array $activities = [];

    public function mount(): void
    {
        $this->activities = [
            ["timestamp" => "2026-05-28 09:15:00", "description" => "User logged in from Chrome on Windows", "type" => "login"],
            ["timestamp" => "2026-05-28 09:22:00", "description" => "Updated profile email address", "type" => "update"],
            ["timestamp" => "2026-05-28 10:05:00", "description" => "User logged in from Safari on macOS", "type" => "login"],
            ["timestamp" => "2026-05-28 10:30:00", "description" => "Deleted project Old Marketing Campaign", "type" => "delete"],
            ["timestamp" => "2026-05-28 11:00:00", "description" => "Updated notification preferences", "type" => "update"],
            ["timestamp" => "2026-05-28 11:45:00", "description" => "Deleted file quarterly-report-draft.pdf", "type" => "delete"],
            ["timestamp" => "2026-05-28 12:30:00", "description" => "User logged in from Firefox on Linux", "type" => "login"],
            ["timestamp" => "2026-05-28 13:15:00", "description" => "Updated account password", "type" => "update"],
            ["timestamp" => "2026-05-28 14:00:00", "description" => "Deleted team member Jane Smith", "type" => "delete"],
            ["timestamp" => "2026-05-28 15:30:00", "description" => "Updated billing information", "type" => "update"],
        ];
    }
}
