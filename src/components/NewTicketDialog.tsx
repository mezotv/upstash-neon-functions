"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import TicketForm from "@/components/TicketForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function NewTicketDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New ticket
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>New ticket</DialogTitle>
          <DialogDescription>
            Add a customer request to the board for triage.
          </DialogDescription>
        </DialogHeader>

        <TicketForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
