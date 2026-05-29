<?php

use App\Livewire\ActivityLog;
use App\Models\User;
use Livewire\Livewire;

test('activity log component renders', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    Livewire::test(ActivityLog::class)
        ->assertStatus(200);
});

test('activity log contains 10 entries', function () {
    $component = new ActivityLog;
    $entries = $component->entries();

    expect($entries)->toHaveCount(10);
});

test('each activity log entry has required fields', function () {
    $component = new ActivityLog;
    $entries = $component->entries();

    foreach ($entries as $entry) {
        expect($entry)->toHaveKeys(['timestamp', 'description', 'type']);
        expect($entry['type'])->toBeIn(['login', 'update', 'delete']);
    }
});
