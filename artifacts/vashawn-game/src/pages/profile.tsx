import React from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSaveUserProfile } from "@workspace/api-client-react";
import { GlassCard } from "@/components/ui/glass";
import { motion } from "framer-motion";
import { ChevronLeft, ArrowRight, Loader2 } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.coerce.number().min(5, "Age must be at least 5").max(120, "Age must be valid"),
  gender: z.string().min(1, "Please select a gender"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileScreen() {
  const [, setLocation] = useLocation();
  const { mutateAsync: saveProfile, isPending } = useSaveUserProfile();

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", gender: "" }
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await saveProfile({
        data: {
          ...data,
          preferredVoice: "onyx" // default voice
        }
      });
      setLocation("/game");
    } catch (error) {
      console.error("Failed to save profile", error);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4">
      {/* Blurred Background */}
      <img 
        src={`${import.meta.env.BASE_URL}images/bg-painting.png`} 
        alt="" aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-60 scale-110"
      />
      <div className="absolute inset-0 bg-background/60"></div>

      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center">
        <button 
          onClick={() => setLocation("/")}
          className="glass-button flex items-center gap-2 px-4 py-2 text-sm font-bold text-muted-foreground uppercase tracking-wider"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Start
        </button>
      </div>

      {/* Form Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold mb-2">Welcome!</h2>
            <p className="text-muted-foreground">Let Vashawn know a little about you before we begin.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2 ml-1">What is your name?</label>
              <input 
                {...register("name")}
                className="glass-input" 
                placeholder="Type your name..."
              />
              {errors.name && <p className="text-destructive text-sm mt-1 ml-1 font-medium">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2 ml-1">How old are you?</label>
              <input 
                type="number"
                {...register("age")}
                className="glass-input" 
                placeholder="Your age"
              />
              {errors.age && <p className="text-destructive text-sm mt-1 ml-1 font-medium">{errors.age.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2 ml-1">Gender</label>
              <select 
                {...register("gender")}
                className="glass-input appearance-none"
              >
                <option value="" disabled>Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
              {errors.gender && <p className="text-destructive text-sm mt-1 ml-1 font-medium">{errors.gender.message}</p>}
            </div>

            <button 
              type="submit" 
              disabled={isPending}
              className="glass-button-primary w-full py-4 mt-4 flex items-center justify-center gap-2 text-lg"
            >
              {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>Let's Go <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
}
