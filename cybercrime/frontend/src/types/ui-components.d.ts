// Type declarations for UI components that may not have types
declare module '@radix-ui/react-accordion';
declare module '@radix-ui/react-alert-dialog';
declare module '@radix-ui/react-aspect-ratio';
declare module '@radix-ui/react-avatar';
declare module '@radix-ui/react-checkbox';
declare module '@radix-ui/react-collapsible';
declare module '@radix-ui/react-context-menu';
declare module '@radix-ui/react-dropdown-menu';
declare module '@radix-ui/react-hover-card';
declare module '@radix-ui/react-menubar';
declare module '@radix-ui/react-navigation-menu';
declare module '@radix-ui/react-popover';
declare module '@radix-ui/react-progress';
declare module '@radix-ui/react-radio-group';
declare module '@radix-ui/react-scroll-area';
declare module '@radix-ui/react-slider';
declare module '@radix-ui/react-switch';
declare module '@radix-ui/react-tabs';
declare module '@radix-ui/react-toggle';
declare module '@radix-ui/react-toggle-group';
declare module '@radix-ui/react-tooltip';
declare module 'react-day-picker@8.10.1';
declare module 'embla-carousel-react@8.6.0';
declare module 'cmdk@1.1.1';
declare module 'vaul@1.1.2';
declare module 'input-otp@1.4.2';
declare module 'react-hook-form@7.55.0' {
  export type FieldValues = Record<string, any>;
  export type FieldPath<TFieldValues extends FieldValues> = string & keyof TFieldValues;
  export interface ControllerProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> {
    name: TName;
    control?: any;
    render?: any;
    [key: string]: any;
  }
  export const Controller: React.ComponentType<ControllerProps>;
  export const FormProvider: React.ComponentType<any>;
  export function useFormContext<TFieldValues extends FieldValues = FieldValues>(): any;
  export function useFormState<TFieldValues extends FieldValues = FieldValues>(props?: any): any;
}

declare module 'embla-carousel-react@8.6.0' {
  export type UseEmblaCarouselType = [any, any];
  export default function useEmblaCarousel(options?: any, plugins?: any): UseEmblaCarouselType;
}

declare module 'input-otp@1.4.2' {
  export interface InputOTPContextValue {
    slots?: Array<{ char?: string; hasFakeCaret?: boolean; isActive?: boolean }>;
    [key: string]: any;
  }
  export const OTPInputContext: React.Context<InputOTPContextValue | null>;
  export const OTPInput: React.ComponentType<any>;
}

declare module 'sonner@2.0.3' {
  export type ToasterProps = {
    theme?: 'light' | 'dark' | 'system';
    [key: string]: any;
  };
  export const Toaster: React.ComponentType<ToasterProps>;
}

declare module 'react-resizable-panels@2.1.7';
declare module 'next-themes@0.4.6';
