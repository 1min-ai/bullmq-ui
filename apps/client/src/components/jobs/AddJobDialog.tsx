import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { jobsApi, queuesApi } from "@/lib/api";

const schema = z.object({
  queueName: z.string().min(1, "Queue is required"),
  jobName: z.string().min(1, "Job name is required"),
  data: z.string().refine((v) => { try { JSON.parse(v); return true; } catch { return false; } }, "Must be valid JSON"),
  delay: z.string().optional(),
  priority: z.string().optional(),
  attempts: z.string().optional(),
  scheduleType: z.enum(["none", "cron", "interval"]),
  cronPattern: z.string().optional(),
  intervalMs: z.string().optional(),
}).refine(
  (d) => d.scheduleType !== "cron" || (d.cronPattern && d.cronPattern.trim().length > 0),
  { message: "Cron pattern is required", path: ["cronPattern"] },
).refine(
  (d) => d.scheduleType !== "interval" || (d.intervalMs && !isNaN(Number(d.intervalMs)) && Number(d.intervalMs) > 0),
  { message: "Interval must be a positive number", path: ["intervalMs"] },
);

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultQueue?: string;
}

export function AddJobDialog({ defaultQueue }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: queues = [] } = useQuery({
    queryKey: ["queues"],
    queryFn: queuesApi.list,
    enabled: open,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      queueName: defaultQueue ?? "",
      jobName: "",
      data: "{}",
      delay: "",
      priority: "",
      attempts: "",
      scheduleType: "none",
      cronPattern: "",
      intervalMs: "",
    },
  });

  const selectedQueue = watch("queueName");
  const scheduleType = watch("scheduleType");

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      jobsApi.add({
        queueName: values.queueName,
        jobName: values.jobName,
        data: values.data,
        options: {
          delay: values.delay ? Number(values.delay) : undefined,
          priority: values.priority ? Number(values.priority) : undefined,
          attempts: values.attempts ? Number(values.attempts) : undefined,
          repeat: values.scheduleType === "cron"
            ? { pattern: values.cronPattern }
            : values.scheduleType === "interval"
            ? { every: Number(values.intervalMs) }
            : undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Job added (ID: ${res.jobId})`);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["queues"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      reset();
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Queue</Label>
            <Select
              value={selectedQueue}
              onValueChange={(v) => setValue("queueName", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select queue…" />
              </SelectTrigger>
              <SelectContent>
                {queues.map((q) => (
                  <SelectItem key={q.name} value={q.name}>{q.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.queueName && <p className="text-xs text-destructive">{errors.queueName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Job Name</Label>
            <Input placeholder="e.g. send-email" {...register("jobName")} />
            {errors.jobName && <p className="text-xs text-destructive">{errors.jobName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Data (JSON)</Label>
            <Textarea
              placeholder='{"key": "value"}'
              className="font-mono text-xs h-28 resize-none"
              {...register("data")}
            />
            {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Delay (ms)</Label>
              <Input type="number" placeholder="0" {...register("delay")} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Input type="number" placeholder="0" {...register("priority")} />
            </div>
            <div className="space-y-1.5">
              <Label>Attempts</Label>
              <Input type="number" placeholder="1" {...register("attempts")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Schedule</Label>
            <Select
              value={scheduleType}
              onValueChange={(v) => setValue("scheduleType", v as "none" | "cron" | "interval")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">One-time</SelectItem>
                <SelectItem value="cron">Cron pattern</SelectItem>
                <SelectItem value="interval">Interval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scheduleType === "cron" && (
            <div className="space-y-1.5">
              <Label>Cron Pattern</Label>
              <Input placeholder="0 * * * *" className="font-mono" {...register("cronPattern")} />
              <p className="text-xs text-muted-foreground">Standard 5-field cron expression (min hour day month weekday)</p>
              {errors.cronPattern && <p className="text-xs text-destructive">{errors.cronPattern.message}</p>}
            </div>
          )}

          {scheduleType === "interval" && (
            <div className="space-y-1.5">
              <Label>Interval (ms)</Label>
              <Input type="number" placeholder="60000" {...register("intervalMs")} />
              <p className="text-xs text-muted-foreground">Repeat every N milliseconds</p>
              {errors.intervalMs && <p className="text-xs text-destructive">{errors.intervalMs.message}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
