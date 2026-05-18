import { useState } from "react";
import { Plus, Camera, PencilLine } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AddEventSheet } from "./AddEventSheet";
import { UploadFlyerSheet } from "./UploadFlyerSheet";

interface Props {
  householdId: string;
  userId: string;
}

export function AddActionFab({ householdId, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const pick = (which: "upload" | "manual") => {
    setOpen(false);
    if (which === "upload") setUploadOpen(true);
    else setAddOpen(true);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed z-20 bottom-24 right-5 md:bottom-auto md:top-20 md:right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lift flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Add event"
      >
        <Plus className="w-6 h-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl pb-8 md:max-w-lg md:mx-auto"
        >
          <SheetHeader className="text-left mb-2">
            <SheetTitle className="font-serif text-2xl">Add to the week</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => pick("upload")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-accent/40 hover:bg-accent/60 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
                <Camera className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <div className="font-medium">Upload a photo</div>
                <div className="text-xs text-muted-foreground">
                  School flyer, schedule, screenshot
                </div>
              </div>
            </button>
            <button
              onClick={() => pick("manual")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary hover:bg-secondary/70 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-card flex items-center justify-center border border-border">
                <PencilLine className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <div className="font-medium">Add manually</div>
                <div className="text-xs text-muted-foreground">
                  Type in the details
                </div>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AddEventSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        householdId={householdId}
        userId={userId}
      />
      <UploadFlyerSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        householdId={householdId}
        userId={userId}
      />
    </>
  );
}
