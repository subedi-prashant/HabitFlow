"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Footprints, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateActivity } from "@/hooks/useTraining";
import { ACTIVITY_TYPES, ActivityType, INTENSITY_LEVELS, IntensityLevel } from "@/lib/training";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ActivityLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_ACTIVITY_NAMES: Record<ActivityType, string> = {
  Walking: "Outdoor walk",
  Running: "Run",
  Cycling: "Ride",
  Swimming: "Swim",
  Hiking: "Hike",
  Sport: "Sport session",
  Yoga: "Yoga practice",
  Mobility: "Mobility session",
  Other: "Activity",
};

export function ActivityLogDialog({ open, onOpenChange }: ActivityLogDialogProps) {
  const createActivity = useCreateActivity();
  const [activityType, setActivityType] = useState<ActivityType>("Walking");
  const [name, setName] = useState(DEFAULT_ACTIVITY_NAMES.Walking);
  const [performedOn, setPerformedOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [distanceKm, setDistanceKm] = useState("");
  const [calories, setCalories] = useState("");
  const [intensity, setIntensity] = useState<IntensityLevel>("Moderate");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setActivityType("Walking");
    setName(DEFAULT_ACTIVITY_NAMES.Walking);
    setPerformedOn(format(new Date(), "yyyy-MM-dd"));
    setDurationMinutes("30");
    setDistanceKm("");
    setCalories("");
    setIntensity("Moderate");
    setNotes("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleActivityTypeChange = (nextType: ActivityType) => {
    if (!name.trim() || name === DEFAULT_ACTIVITY_NAMES[activityType]) {
      setName(DEFAULT_ACTIVITY_NAMES[nextType]);
    }
    setActivityType(nextType);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedDuration = Number(durationMinutes);
    const parsedDistance = distanceKm ? Number(distanceKm) : null;
    const parsedCalories = calories ? Number(calories) : null;

    if (!name.trim()) {
      toast.error("Give this activity a name.");
      return;
    }
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 1440) {
      toast.error("Duration must be between 1 and 1,440 minutes.");
      return;
    }
    if (parsedDistance !== null && parsedDistance < 0) {
      toast.error("Distance cannot be negative.");
      return;
    }
    if (parsedCalories !== null && (!Number.isInteger(parsedCalories) || parsedCalories < 0)) {
      toast.error("Calories must be a whole positive number.");
      return;
    }

    createActivity.mutate({
      activityType,
      name: name.trim(),
      performedOn,
      durationMinutes: parsedDuration,
      distanceKm: parsedDistance,
      calories: parsedCalories,
      intensity,
      notes: notes.trim() || null,
    }, {
      onSuccess: () => {
        resetForm();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 sm:w-full">
        <DialogHeader className="border-b border-border px-5 py-5 text-left sm:px-7">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Footprints className="h-5 w-5" />
          </div>
          <DialogTitle className="text-2xl font-extrabold tracking-[-0.04em]">Log an activity</DialogTitle>
          <DialogDescription>Capture movement outside the gym in less than a minute.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="space-y-2">
              <Label>Activity type</Label>
              <Select value={activityType} onValueChange={(value) => handleActivityTypeChange(value as ActivityType)}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activityName">Activity name</Label>
              <Input id="activityName" value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl" maxLength={100} autoFocus />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="activityDate">Date</Label>
                <Input id="activityDate" type="date" value={performedOn} onChange={(event) => setPerformedOn(event.target.value)} className="h-11 rounded-xl" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activityDuration">Duration</Label>
                <div className="relative">
                  <Input id="activityDuration" type="number" min={1} max={1440} value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} className="h-11 rounded-xl pr-16" required />
                  <span className="pointer-events-none absolute right-3 top-3 text-xs font-semibold text-muted-foreground">MIN</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activityDistance">Distance</Label>
                <div className="relative">
                  <Input id="activityDistance" type="number" min={0} step="0.01" value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} className="h-11 rounded-xl pr-12" placeholder="Optional" />
                  <span className="pointer-events-none absolute right-3 top-3 text-xs font-semibold text-muted-foreground">KM</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activityCalories">Calories</Label>
                <Input id="activityCalories" type="number" min={0} step={1} value={calories} onChange={(event) => setCalories(event.target.value)} className="h-11 rounded-xl" placeholder="Optional" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Intensity</Label>
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary p-1">
                {INTENSITY_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-bold transition-colors",
                      intensity === level ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setIntensity(level)}
                    aria-pressed={intensity === level}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activityNotes">Notes</Label>
              <Textarea id="activityNotes" value={notes} onChange={(event) => setNotes(event.target.value)} className="rounded-xl" placeholder="Route, pace, how it felt, or anything worth remembering" maxLength={1000} />
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-card px-5 py-4 sm:px-7">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gap-2 rounded-xl font-bold" disabled={createActivity.isPending}>
              {createActivity.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save activity
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
