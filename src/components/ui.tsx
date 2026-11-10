import * as DialogPrimitive from '@radix-ui/react-dialog';
import {Slot} from '@radix-ui/react-slot';
import {cva,type VariantProps} from 'class-variance-authority';
import {clsx,type ClassValue} from 'clsx';
import {twMerge} from 'tailwind-merge';
import type {ButtonHTMLAttributes} from 'react';
export function cn(...inputs:ClassValue[]){return twMerge(clsx(inputs));}
const variants=cva('btn',{variants:{variant:{default:'btn-primary',outline:'btn-outline',ghost:'btn-ghost'}},defaultVariants:{variant:'default'}});
export function Button({className,variant,asChild=false,...props}:ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof variants>&{asChild?:boolean}){const Comp=asChild?Slot:'button';return <Comp className={cn(variants({variant}),className)} {...props}/>;}
export const Dialog=DialogPrimitive.Root;
export const DialogTitle=DialogPrimitive.Title;
export const DialogDescription=DialogPrimitive.Description;
export const DialogClose=DialogPrimitive.Close;
export function DialogContent({children}: {children:React.ReactNode}){return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay"/><DialogPrimitive.Content className="dialog-content">{children}</DialogPrimitive.Content></DialogPrimitive.Portal>}
