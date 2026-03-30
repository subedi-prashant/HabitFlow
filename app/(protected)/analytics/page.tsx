"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track your habit performance</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-1">Analytics Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Weekly completion charts, monthly heatmaps, streak leaderboards, and category breakdowns will appear here once enabled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
