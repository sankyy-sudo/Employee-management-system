import { motion } from "framer-motion";

export default function Loader() {
  return (
    <div className="flex h-screen items-center justify-center bg-transparent">
      <motion.div
        className="h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent"
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: 1,
          ease: "linear",
        }}
      />
    </div>
  );
}
