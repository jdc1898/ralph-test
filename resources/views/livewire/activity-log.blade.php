<div class="space-y-4">
    <flux:heading size="lg">Recent Activity</flux:heading>

    <div class="divide-y divide-zinc-200 dark:divide-zinc-700">
        @foreach ($this->entries() as $entry)
            <div class="flex items-center justify-between gap-4 py-3">
                <div class="flex items-center gap-3 min-w-0">
                    <flux:badge
                        color="{{ $entry['type'] === 'login' ? 'green' : ($entry['type'] === 'update' ? 'blue' : 'red') }}"
                        size="sm"
                    >{{ $entry['type'] }}</flux:badge>
                    <flux:text class="truncate">{{ $entry['description'] }}</flux:text>
                </div>
                <flux:text class="text-sm shrink-0 text-zinc-500 dark:text-zinc-400">{{ $entry['timestamp'] }}</flux:text>
            </div>
        @endforeach
    </div>
</div>
