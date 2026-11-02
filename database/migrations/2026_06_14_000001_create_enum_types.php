<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("CREATE TYPE admin_level AS ENUM ('owner','admin','member','viewer');");
        DB::statement("CREATE TYPE issue_status AS ENUM ('backlog','todo','in_progress','in_review','done','cancelled');");
        DB::statement("CREATE TYPE issue_priority AS ENUM ('no_priority','urgent','high','medium','low');");
        DB::statement("CREATE TYPE project_status AS ENUM ('planning','in_progress','paused','completed','cancelled');");
        DB::statement("CREATE TYPE ticket_status AS ENUM ('new','open','pending','on_hold','solved','closed');");
        DB::statement("CREATE TYPE ticket_priority AS ENUM ('low','normal','high','urgent');");
        DB::statement("CREATE TYPE ticket_channel AS ENUM ('email','chat','portal','api');");
        DB::statement("CREATE TYPE article_status AS ENUM ('draft','published','archived');");
        DB::statement("CREATE TYPE csat_rating AS ENUM ('thumbs_up','thumbs_down');");
        DB::statement("CREATE TYPE sender_type AS ENUM ('user','contact');");
        DB::statement("CREATE TYPE workspace_plan AS ENUM ('starter','pro','enterprise');");
        DB::statement("CREATE TYPE team_member_role AS ENUM ('lead','member');");
        DB::statement("CREATE TYPE webhook_event AS ENUM ('issue.created','issue.updated','issue.status_changed','issue.deleted','ticket.created','ticket.updated','ticket.status_changed','ticket.assigned','ticket.resolved','sla.breached');");
    }

    public function down(): void
    {
        foreach ([
            'webhook_event','team_member_role','workspace_plan','sender_type','csat_rating',
            'article_status','ticket_channel','ticket_priority','ticket_status','project_status',
            'issue_priority','issue_status','admin_level',
        ] as $type) {
            DB::statement("DROP TYPE IF EXISTS {$type};");
        }
    }
};
