"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateHabit, useUpdateHabit } from "@/hooks/useHabits";
import { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const EMOJI_OPTIONS = ["✅", "💧", "🏃", "📚", "🧘", "💪", "🎯", "🌱", "💤", "🍎", "✍️", "🎵", "🧠", "❤️", "🔥", "⭐"];
const COLOR_OPTIONS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];
const CATEGORIES = ["Health", "Fitness", "Learning", "Mindfulness", "Custom"] as const;
const FREQUENCIES = ["daily", "weekly", "custom"] as const;

const habitSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  icon: z.string().default("✅"),
  color: z.string().default("#4F46E5"),
  category: z.enum(CATEGORIES).default("Custom"),
  frequency: z.enum(FREQUENCIES).default("daily"),
  target_value: z.coerce.number().min(1).default(1),
  unit: z.string().default("times"),
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
      color: "#4F46E5",
      category: "Custom",
      frequency: "daily",
      target_value: 1,
      unit: "times",
    },
  });

  const selectedIcon = watch("icon");
  const selectedColor = watch("color");

  useEffect(() => {
    if (editHabit) {
      reset({
        name: editHabit.name,
        description: editHabit.description || "",
        icon: editHabit.icon,
        color: editHabit.color,
        category: editHabit.category,
        frequency: editHabit.frequency,
        target_value: editHabit.target_value,
        unit: editHabit.unit,
        reminder_time: editHabit.reminder_time || undefined,
      });
    } else {
      reset({
        name: "",
        description: "",
        icon: "✅",
        color: "#4F46E5",
        category: "Custom",
        frequency: "daily",
        target_value: 1,
        unit: "times",
      });
    }
  }, [editHabit, reset]);

  const onSubmit = async (data: HabitFormValues) => {
    if (isEditing && editHabit) {
      await updateHabit.mutateAsync({
        id: editHabit.id,
        ...data,
        reminder_time: data.reminder_time || null,
      });
    } else {
      await createHabit.mutateAsync({
        ...data,
        reminder_time: data.reminder_time || null,
      });
    }
    onOpenChange(false);
    reset();
  };

  const isPending = createHabit.isPending || updateHabit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Habit" : "Create New Habit"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Habit Name *</Label>
            <Input id="name" placeholder="e.g. Drink Water" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional description..."
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setValue("icon", emoji)}
                  className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center border-2 transition-colors ${
                    selectedIcon === emoji
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("color", color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                defaultValue={editHabit?.category || "Custom"}
                onValueChange={(val) => setValue("category", val as typeof CATEGORIES[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                defaultValue={editHabit?.frequency || "daily"}
                onValueChange={(val) => setValue("frequency", val as typeof FREQUENCIES[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_value">Target Value</Label>
              <Input
                id="target_value"
                type="number"
                min={1}
                {...register("target_value")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" placeholder="e.g. glasses, minutes" {...register("unit")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder_time">Reminder Time (optional)</Label>
            <Input id="reminder_time" type="time" {...register("reminder_time")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
