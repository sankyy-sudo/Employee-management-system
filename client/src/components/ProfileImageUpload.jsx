import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

export default function ProfileImageUpload() {
  const { user, setUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    try {
      setError("");
      setSuccess("");
      const file = e.target.files?.[0];

      if (!file) return;

      // Validate file
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }

      const formData = new FormData();
      formData.append("image", file);

      setUploading(true);
      const { data } = await api.post("/profile/image", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setSuccess("Profile image updated successfully!");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Update user context
      if (setUser && user) {
        setUser({ ...user, profileImage: data.profileImage });
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (!window.confirm("Are you sure you want to delete your profile image?")) {
        return;
      }

      setError("");
      const { data } = await api.delete("/profile/image");

      setSuccess(data.message);
      if (setUser && user) {
        setUser({ ...user, profileImage: null });
      }

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete image");
    }
  };

  const profileImageUrl = user?.profileImage 
    ? `${import.meta.env.VITE_API_URL}/${user.profileImage}` 
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={user?.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-blue-200"
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`;
            }}
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">No image</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </button>

          {profileImageUrl && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete Image
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
          {success}
        </div>
      )}
    </div>
  );
}
