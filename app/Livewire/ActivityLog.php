<?php

namespace App\Livewire;

use Livewire\Component;

class ActivityLog extends Component
{
    /**
     * @return array<int, array{timestamp: string, description: string, type: string}>
     */
    public function entries(): array
    {
        return [
            ['timestamp' => '2026-05-28 08:01:00', 'description' => 'User logged in from Chrome on macOS', 'type' => 'login'],
            ['timestamp' => '2026-05-28 08:15:32', 'description' => 'Profile name updated to "David Church"', 'type' => 'update'],
            ['timestamp' => '2026-05-28 08:47:11', 'description' => 'Email address updated', 'type' => 'update'],
            ['timestamp' => '2026-05-28 09:02:45', 'description' => 'Draft post "Getting Started" deleted', 'type' => 'delete'],
            ['timestamp' => '2026-05-28 09:30:00', 'description' => 'User logged in from Safari on iPhone', 'type' => 'login'],
            ['timestamp' => '2026-05-28 10:05:18', 'description' => 'Account password changed', 'type' => 'update'],
            ['timestamp' => '2026-05-28 10:22:53', 'description' => 'API token "production-key" deleted', 'type' => 'delete'],
            ['timestamp' => '2026-05-28 11:00:00', 'description' => 'User logged in from Firefox on Windows', 'type' => 'login'],
            ['timestamp' => '2026-05-28 11:14:37', 'description' => 'Notification preferences updated', 'type' => 'update'],
            ['timestamp' => '2026-05-28 11:45:09', 'description' => 'Uploaded avatar image deleted', 'type' => 'delete'],
        ];
    }

    public function render(): \Illuminate\View\View
    {
        return view('livewire.activity-log');
    }
}
