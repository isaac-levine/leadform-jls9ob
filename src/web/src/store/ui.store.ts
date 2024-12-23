import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ToastVariant, ToastProps, DialogProps } from '../types/ui.types';

// Constants
const TOAST_DURATION = 3000;
const DEFAULT_THEME = 'light';
const STORAGE_KEY = 'ui-theme';
const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
} as const;

// Type definitions
type Theme = 'light' | 'dark';
type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface UIState {
  // Theme
  theme: Theme;
  toggleTheme: () => void;
  
  // Toast
  toast: ToastProps | null;
  showToast: (props: Omit<ToastProps, 'onClose'>) => void;
  hideToast: () => void;
  
  // Dialog
  dialog: DialogProps | null;
  showDialog: (props: Omit<DialogProps, 'onClose'>) => void;
  hideDialog: () => void;
  
  // Navigation
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isNavigating: boolean;
  setNavigating: (isNavigating: boolean) => void;
  
  // Responsive
  breakpoint: Breakpoint;
  setBreakpoint: (width: number) => void;
}

// Create the store with middleware
const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Theme state and actions
        theme: DEFAULT_THEME,
        toggleTheme: () => {
          const newTheme = get().theme === 'light' ? 'dark' : 'light';
          set({ theme: newTheme }, false, 'toggleTheme');
          // Update document class for theme
          document.documentElement.classList.remove(get().theme);
          document.documentElement.classList.add(newTheme);
        },

        // Toast state and actions
        toast: null,
        showToast: (props) => {
          // Clear existing toast if any
          if (get().toast) {
            get().hideToast();
          }

          const toast: ToastProps = {
            ...props,
            duration: props.duration || TOAST_DURATION,
            onClose: () => get().hideToast(),
          };

          set({ toast }, false, 'showToast');

          // Auto-dismiss toast after duration
          if (toast.duration) {
            setTimeout(() => {
              // Only hide if this toast is still showing
              if (get().toast?.message === toast.message) {
                get().hideToast();
              }
            }, toast.duration);
          }
        },
        hideToast: () => set({ toast: null }, false, 'hideToast'),

        // Dialog state and actions
        dialog: null,
        showDialog: (props) => {
          const dialog: DialogProps = {
            ...props,
            open: true,
            onClose: () => get().hideDialog(),
          };
          set({ dialog }, false, 'showDialog');
        },
        hideDialog: () => {
          if (get().dialog) {
            const dialog = { ...get().dialog, open: false };
            set({ dialog }, false, 'hideDialog');
            // Remove dialog after animation
            setTimeout(() => {
              set({ dialog: null }, false, 'removeDialog');
            }, 300);
          }
        },

        // Navigation state and actions
        isSidebarOpen: window?.innerWidth >= BREAKPOINTS.desktop,
        toggleSidebar: () => 
          set(
            state => ({ isSidebarOpen: !state.isSidebarOpen }), 
            false, 
            'toggleSidebar'
          ),
        isNavigating: false,
        setNavigating: (isNavigating) => 
          set({ isNavigating }, false, 'setNavigating'),

        // Responsive state and actions
        breakpoint: 'desktop',
        setBreakpoint: (width) => {
          let breakpoint: Breakpoint = 'desktop';
          if (width < BREAKPOINTS.tablet) {
            breakpoint = 'mobile';
          } else if (width < BREAKPOINTS.desktop) {
            breakpoint = 'tablet';
          }
          set({ breakpoint }, false, 'setBreakpoint');
        },
      }),
      {
        name: STORAGE_KEY,
        partialize: (state) => ({ theme: state.theme }),
      }
    )
  )
);

// Initialize theme on load
if (typeof window !== 'undefined') {
  const theme = useUIStore.getState().theme;
  document.documentElement.classList.add(theme);

  // Initialize breakpoint detection
  const handleResize = () => {
    useUIStore.getState().setBreakpoint(window.innerWidth);
  };
  
  window.addEventListener('resize', handleResize);
  handleResize(); // Initial check
}

export default useUIStore;