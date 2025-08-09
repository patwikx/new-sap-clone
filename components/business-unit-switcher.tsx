"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle, Store } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useParams, useRouter } from "next/navigation"
import { useBusinessUnitModal } from "@/hooks/use-bu-modal"
import { BusinessUnitItem } from "@/types/business-unit-types"

type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>


interface BusinessUnitSwitcherProps extends PopoverTriggerProps {
  items: BusinessUnitItem[];
}

export default function BusinessUnitSwitcher({ className, items = [] }: BusinessUnitSwitcherProps) {
  const businessUnitModal = useBusinessUnitModal();
  const params = useParams();
  const router = useRouter();

  // --- THIS IS THE KEY LOGIC CHANGE ---
  // Determine if the switcher should be an interactive dropdown.
  // This will be true for Admins (items.length > 1) and false for regular users (items.length <= 1).
  const isSwitcherActive = items.length > 1;

  const formattedItems = items.map((item) => ({
    label: item.name,
    value: item.id
  }));

  const currentBusinessUnit = formattedItems.find(
    (item) => item.value === params.businessUnitId
  );

  const [open, setOpen] = React.useState(false);

  const onBusinessUnitSelect = (businessUnit: { value: string, label: string }) => {
    setOpen(false);
    router.push(`/${businessUnit.value}`);
  };

  // --- RENDER A STATIC, NON-CLICKABLE DISPLAY FOR REGULAR USERS ---
  if (!isSwitcherActive) {
    return (
      <div className={cn(
        "flex items-center justify-start text-sm font-medium px-3 py-2 border border-transparent rounded-md", 
        className
      )}>
        <Store className="mr-2 h-4 w-4" />
        <span className="truncate">
          {currentBusinessUnit?.label || "No Unit Assigned"}
        </span>
      </div>
    );
  }

  // --- RENDER THE FULL, INTERACTIVE DROPDOWN FOR ADMINISTRATORS ---
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a Business Unit"
          className={cn("w-[280px] justify-between", className)}
        >
          <Store className="mr-2 h-4 w-4" />
          <span className="truncate">
            {currentBusinessUnit?.label || "Select Unit..."}
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0"
        style={{ minWidth: "var(--radix-popover-trigger-width)" }}
      >
        <Command>
          <CommandList>
            <CommandInput placeholder="Search unit..." />
            <CommandEmpty>No business unit found.</CommandEmpty>
            <CommandGroup heading="Business Units">
              {formattedItems.map((businessUnit) => (
                <CommandItem
                  key={businessUnit.value}
                  onSelect={() => onBusinessUnitSelect(businessUnit)}
                  className="text-sm"
                >
                  <Store className="mr-2 h-4 w-4" />
                  {businessUnit.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      currentBusinessUnit?.value === businessUnit.value
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <CommandList>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  businessUnitModal.onOpen()
                }}
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Create Business Unit
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};