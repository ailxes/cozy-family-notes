import { useState } from "react";
import { Plus, Camera, ImagePlus, PencilLine, Mic } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AddEventSheet } from "./AddEventSheet";
import { UploadFlyerSheet } from "./UploadFlyerSheet";
import { DictateEventSheet } from "./DictateEventSheet";

interface Props {
  initialDate?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: (date: Date) => void;
}

export function AddActionFab({
  initialDate,
  open: ctlOpen,
  onOpenChange: ctlSet,
  onSaved,
}: Props = {}) {
  const [internal, setInternal] = useState(false);
  const open = ctlOpen ?? internal;
  const setOpen = ctlSet ?? setInternal;
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"camera" | "library">("library");
  const [dictateOpen, setDictateOpen] = useState(false);

  const pick = (which: "camera" | "library" | "manual" | "dictate") => {
    setOpen(false);
    if (which === "manual") setAddOpen(true);
    else if (which === "dictate") setDictateOpen(true);
    else {
      setUploadMode(which);
      setUploadOpen(true);
    }
  };

  return (
    <>
      <div className="fixed z-20 bottom-24 right-5 md:bottom-auto md:top-20 md:right-6 flex flex-col items-center gap-3">
        <button
          onClick={() => setDictateOpen(true)}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lift flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          aria-label="Add event by voice"
        >
          <Mic className="w-6 h-6" />
        </button>
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-card text-foreground border border-border shadow-lift flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          aria-label="Add event"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

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
              onClick={() => pick("dictate")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary/10 hover:bg-primary/15 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium">Dictate with voice</div>
                <div className="text-xs text-muted-foreground">
                  Say it out loud — AI handles the rest
                </div>
              </div>
            </button>
            <button
              onClick={() => pick("camera")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-accent/40 hover:bg-accent/60 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
                <Camera className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <div className="font-medium">Take a photo</div>
                <div className="text-xs text-muted-foreground">
                  Open your camera to snap a flyer
                </div>
              </div>
            </button>
            <button
              onClick={() => pick("library")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-accent/30 hover:bg-accent/50 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
                <ImagePlus className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <div className="font-medium">Choose from library</div>
                <div className="text-xs text-muted-foreground">
                  Pick a saved photo or screenshot
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
        initialDate={initialDate}
        onSaved={onSaved}
      />
      <UploadFlyerSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        mode={uploadMode}
        onSaved={onSaved}
      />
      <DictateEventSheet
        open={dictateOpen}
        onOpenChange={setDictateOpen}
        onSaved={onSaved}
      />
    </>
  );
}
