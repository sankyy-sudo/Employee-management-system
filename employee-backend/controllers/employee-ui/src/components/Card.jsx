import { motion } from "framer-motion";

export default function Card({ title, value }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-white/60 backdrop-blur-lg border border-white/30 p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all"
    >
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className="text-2xl font-bold text-gray-800">{value}</h2>
    </motion.div>
  );
}
