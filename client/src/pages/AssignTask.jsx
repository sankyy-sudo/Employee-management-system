import Layout from "../components/Layout";
import { motion } from "framer-motion";

export default function AssignTask() {
  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow">

          {/* Title */}
          <h1 className="text-xl font-semibold mb-1">
            Assign New Task
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Create and assign tasks to employees
          </p>

          {/* Task Title */}
          <div className="mb-4">
            <label className="text-sm font-medium">Task Title</label>
            <input
              className="w-full mt-1 border p-2 rounded-lg"
              placeholder="API Integration"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-sm font-medium">Description</label>
            <textarea
              rows="4"
              className="w-full mt-1 border p-2 rounded-lg"
              placeholder="Integrate REST APIs for authentication..."
            />
          </div>

          {/* Assign + Priority */}
          <div className="grid grid-cols-2 gap-4 mb-4">

            <div>
              <label className="text-sm font-medium">Assign To</label>
              <select className="w-full mt-1 border p-2 rounded-lg">
                <option>John Doe</option>
                <option>Sarah Johnson</option>
                <option>Michael Brown</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <select className="w-full mt-1 border p-2 rounded-lg">
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>

          </div>

          {/* Date */}
          <div className="mb-6">
            <label className="text-sm font-medium">Due Date</label>
            <input
              type="date"
              className="w-full mt-1 border p-2 rounded-lg"
            />
          </div>

          {/* Button */}
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg shadow hover:bg-blue-700 transition">
            Assign Task
          </button>

        </div>
      </motion.div>
    </Layout>
  );
}