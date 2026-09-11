"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { z } from "zod";
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
import { useCreateHabit, useUpdateHabit } from "@/hooks/useHabits";
import { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = ["✅", "💧", "🏃", "📚", "🧘", "💪", "🎯", "🌱", "💤", "🍎", "✍️", "🎵", "🧠", "❤️", "🔥", "⭐"];
const COLOR_OPTIONS = ["#B6EA2B", "#181C13", "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];
const CATEGORIES = ["Health", "Fitness", "Learning", "Mindfulness", "Custom"] as const;
const FREQUENCIES = ["daily", "weekly", "custom"] as const;
const WEEK_DAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
];
const HABIT_TEMPLATES = [
  { label: "Hydration", name: "Drink water", icon: "💧", category: "Health", targetValue: 8, unit: "glasses" },
  { label: "Daily walk", name: "Take a walk", icon: "🏃", category: "Fitness", targetValue: 30, unit: "minutes" },
  { label: "Strength", name: "Strength training", icon: "💪", category: "Fitness", targetValue: 1, unit: "session" },
  { label: "Read", name: "Read", icon: "📚", category: "Learning", targetValue: 20, unit: "pages" },
] as const;

const habitSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  icon: z.string().default("✅"),
  color: z.string().default("#B6EA2B"),
  category: z.enum(CATEGORIES).default("Custom"),
  frequency: z.enum(FREQUENCIES).default("daily"),
  frequency_days: z.array(z.number()).default([]),
  target_value: z.coerce.number().min(1, "Target must be at least 1").default(1),
  unit: z.string().min(1, "Unit is required").max(40).default("times"),
  reminder_time: z.string().optional(),
});

type HabitFormValues = z.infer<typeof habitSchema>;

interface AddHabitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editHabit?: Tables<"habits"> | null;
}

export function AddHabitModal({ open, onOpenChange, editHabit }: AddHabitModalProps) {
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const isEditing = !!editHabit;
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "✅",
      color: "#B6EA2B",
      category: "Custom",
      frequency: "daily",
      frequency_days: [],
      target_value: 1,
      unit: "times",
      reminder_time: "",
    },
  });

  const selectedIcon = watch("icon");
  const selectedColor = watch("color");
  const selectedCategory = watch("category");
  const selectedFrequency = watch("frequency");
  const selectedDays = watch("frequency_days");

  useEffect(() => {
    if (editHabit) {
      reset({
        name: editHabit.name,
        description: editHabit.description || "",
        icon: editHabit.icon,
        color: editHabit.color,
        category: editHabit.category,
        frequency: editHabit.frequency,
        frequency_days: editHabit.frequency_days || [],
        target_value: editHabit.target_value,
        unit: editHabit.unit,
        reminder_time: editHabit.reminder_time || "",
      });
      return;
    }

    reset({
      name: "",
      description: "",
      icon: "✅",
      color: "#B6EA2B",
      category: "Custom",
      frequency: "daily",
      frequency_days: [],
      target_value: 1,
      unit: "times",
      reminder_time: "",
    });
  }, [editHabit, open, reset]);

  const closeDialog = () => {
    onOpenChange(false);
    reset();
  };

  const handleTemplate = (template: (typeof HABIT_TEMPLATES)[number]) => {
    setValue("name", template.name, { shouldValidate: true });
    setValue("icon", template.icon);
    setValue("category", template.category);
    setValue("target_value", template.targetValue);
    setValue("unit", template.unit);
  };

  const toggleDay = (day: number) => {
    setValue(
      "frequency_days",
      selectedDays.includes(day) ? selectedDays.filter((value) => value !== day) : [...selectedDays, day]
    );
  };

  const onSubmit = (data: HabitFormValues) => {
    const values = {
      ...data,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      reminder_time: data.reminder_time || null,
      frequency_days: data.frequency === "custom" ? data.frequency_days : [],
    };

    if (isEditing && editHabit) {
      updateHabit.mutate({ id: editHabit.id, ...values }, { onSuccess: closeDialog });
      return;
    }

    createHabit.mutate(values, { onSuccess: closeDialog });
  };

  const isPending = createHabit.isPending || updateHabit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 sm:w-full">
        <DialogHeader className="border-b border-border px-5 py-5 text-left sm:px-7">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <DialogTitle className="text-2xl font-extrabold tracking-[-0.04em]">{isEditing ? "Edit habit" : "Create a habit"}</DialogTitle>
          <DialogDescription>{isEditing ? "Adjust the cue, target, or schedule without losing history." : "Start with a clear action that fits into a real day."}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
            {!isEditing && (
              <div className="space-y-3">
                <p className="editorial-kicker">Quick starts</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {HABIT_TEMPLATES.map((template) => (
                    <button key={template.label} type="button" className="rounded-xl border border-border bg-background px-3 py-3 text-left text-sm font-bold transition-colors hover:border-foreground hover:bg-secondary" onClick={() => handleTemplate(template)}>
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Habit name</Label>
              <Input id="name" className="h-11 rounded-xl" placeholder="Name the action, not the outcome" autoFocus {...register("name")} />
              {errors.name && <p className="text-xs font-medium text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Why it matters</Label>
              <Textarea id="description" className="min-h-20 rounded-xl" placeholder="Optional context or a simple cue" {...register("description")} />
              {errors.description && <p className="text-xs font-medium text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setValue("icon", emoji)}
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-lg border text-base transition-colors",
                        selectedIcon === emoji ? "border-foreground bg-primary" : "border-border bg-background hover:bg-secondary"
                      )}
                      aria-label={`Use ${emoji} icon`}
                      aria-pressed={selectedIcon === emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 sm:max-w-24">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setValue("color", color)}
                      className={cn("h-8 w-8 rounded-full border-2 transition-transform hover:scale-105", selectedColor === color ? "border-foreground ring-2 ring-background" : "border-transparent")}
                      style={{ backgroundColor: color }}
                      aria-label={`Use color ${color}`}
                      aria-pressed={selectedColor === color}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={(value) => setValue("category", value as HabitFormValues["category"])}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={selectedFrequency} onValueChange={(value) => setValue("frequency", value as HabitFormValues["frequency"])}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Every day</SelectItem>
                    <SelectItem value="weekly">Once a week</SelectItem>
                    <SelectItem value="custom">Specific days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedFrequency === "custom" && (
              <div className="space-y-2">
                <Label>Repeat on</Label>
                <div className="grid grid-cols-7 gap-1.5">
                  {WEEK_DAYS.map((day, index) => (
                    <button
                      key={`${day.value}-${index}`}
                      type="button"
                      className={cn(
                        "h-10 rounded-xl text-xs font-black transition-colors",
                        selectedDays.includes(day.value) ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => toggleDay(day.value)}
                      aria-pressed={selectedDays.includes(day.value)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_value">Daily target</Label>
                <Input id="target_value" type="number" min={1} className="h-11 rounded-xl" {...register("target_value")} />
                {errors.target_value && <p className="text-xs font-medium text-destructive">{errors.target_value.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input id="unit" className="h-11 rounded-xl" placeholder="minutes, glasses" {...register("unit")} />
                {errors.unit && <p className="text-xs font-medium text-destructive">{errors.unit.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder_time">Reminder time</Label>
              <Input id="reminder_time" type="time" className="h-11 rounded-xl" {...register("reminder_time")} />
              <p className="text-xs leading-5 text-muted-foreground">Optional. Browser reminders still require notification permission in Settings.</p>
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-card px-5 py-4 sm:px-7">
            <Button type="button" variant="outline" className="rounded-xl" onClick={closeDialog}>Cancel</Button>
            <Button type="submit" className="gap-2 rounded-xl font-bold" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Save changes" : "Create habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
