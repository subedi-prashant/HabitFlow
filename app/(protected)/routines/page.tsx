"use client";

import { ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function RoutinesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Routines</h1>
        <p className="text-muted-foreground mt-1">Organize habits into daily routines</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ListChecks className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-1">Routines Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Create morning, evening, and custom routines with drag-and-drop reordering. Set an active routine and track completion from the dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
