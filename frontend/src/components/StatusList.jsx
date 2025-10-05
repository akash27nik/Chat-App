import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import dp from "../assets/dp.webp";
import { serverUrl } from "../main";

export default function StatusList({ onOpenStatus, onUpload, socket }) {
  const { userData } = useSelector((state) => state.user);
  const [statuses, setStatuses] = useState([]);
  const [viewCounts, setViewCounts] = useState({});

  // ─── FETCH INITIAL STATUSES ───
  const fetchStatuses = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/status`, {
        withCredentials: true,
      });
      if (Array.isArray(res.data)) setStatuses(res.data);
    } catch (err) {
      console.error("Error fetching statuses:", err);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  // ─── SOCKET REAL-TIME UPDATES ───
  useEffect(() => {
    if (!socket) return;

    const handleNewStatus = (status) => {
      setStatuses((prev) => {
        const filtered = prev.filter((s) => s._id !== status._id);
        return [status, ...filtered];
      });
    };

    const handleStatusDeleted = ({ statusId }) => {
      setStatuses((prev) => prev.filter((s) => s._id !== statusId));
      setViewCounts((prev) => {
        const copy = { ...prev };
        delete copy[statusId];
        return copy;
      });
    };

    const handleStatusViewed = ({ statusId, viewers }) => {
      setStatuses((prev) =>
        prev.map((s) => (s._id === statusId ? { ...s, viewers } : s))
      );
      setViewCounts((prev) => ({ ...prev, [statusId]: viewers.length }));
    };

    socket.on("newStatus", handleNewStatus);
    socket.on("statusDeleted", handleStatusDeleted);
    socket.on("statusViewed", handleStatusViewed);

    return () => {
      socket.off("newStatus", handleNewStatus);
      socket.off("statusDeleted", handleStatusDeleted);
      socket.off("statusViewed", handleStatusViewed);
    };
  }, [socket]);

  // ─── GROUP STATUSES BY USER ───
  const groupByUser = (arr) => {
    const map = {};
    arr.forEach((status) => {
      const uid = status.user._id;
      if (!map[uid]) map[uid] = [];
      map[uid].push(status);
    });
    return Object.values(map);
  };

  const myStatuses = statuses.filter((s) => s.user._id === userData._id);
  const otherStatuses = statuses.filter((s) => s.user._id !== userData._id);
  const groupedOthers = groupByUser(otherStatuses);

  const SegmentedRing = ({
    total,
    seenCount,
    size = 52,
    strokeWidth = 3,
    strokeColor,
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const gap = 2;
    const segmentLength = circumference / total;

    return (
      <svg width={size} height={size} className="absolute top-0 left-0">
        {Array.from({ length: total }).map((_, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={i < seenCount ? "#9ca3af" : strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength - gap} ${circumference}`}
            strokeDashoffset={-segmentLength * i}
            strokeLinecap="round"
          />
        ))}
      </svg>
    );
  };

  return (
    <div className="w-full">
      {/* My Status */}
      <div
        className="flex items-center p-3 hover:bg-gray-200 rounded cursor-pointer"
        onClick={() => myStatuses.length > 0 && onOpenStatus(myStatuses, 0)}
      >
        <div className="relative w-12 h-12 group">
          {myStatuses.length > 0 && (
            <SegmentedRing
              total={myStatuses.length}
              seenCount={0}
              size={52}
              strokeWidth={3}
              strokeColor="#22c55e"
            />
          )}
          <img
            src={userData.image || dp}
            alt="My Status"
            className="w-12 h-12 rounded-full object-cover absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
          <span
            onClick={(e) => {
              e.stopPropagation();
              onUpload();
            }}
            className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-lg leading-none cursor-pointer"
          >
            +
          </span>
        </div>
        <div className="ml-3 flex-1">
          <p className="font-semibold text-sm">My Status</p>
          {myStatuses.length > 0 ? (
            <p className="text-xs text-gray-500">
              {new Date(myStatuses[0].createdAt).toLocaleString()}
            </p>
          ) : (
            <p className="text-xs text-gray-500">Tap + to add status update</p>
          )}
        </div>
      </div>

      {/* Recent Updates */}
      {groupedOthers.length > 0 && (
        <p className="text-xs text-gray-500 pl-3 mt-4 mb-2">Recent updates</p>
      )}

      {groupedOthers.map((userStatuses) => {
        const firstStatus = userStatuses[0];
        const total = userStatuses.length;
        const seenCount = userStatuses.filter((s) =>
          s.viewers?.some((v) => v.user === userData._id)
        ).length;
        const ringColor = "#20c7ff";

        return (
          <div
            key={firstStatus.user._id}
            className="flex items-center p-3 hover:bg-gray-200 rounded cursor-pointer"
            onClick={() => onOpenStatus(userStatuses, 0)}
          >
            <div className="relative w-[52px] h-[52px]">
              <SegmentedRing
                total={total}
                seenCount={seenCount}
                strokeColor={ringColor}
              />
              <img
                src={firstStatus.user.image || dp}
                alt=""
                className="w-12 h-12 rounded-full object-cover absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              />
            </div>
            <div className="ml-3">
              <p className="font-semibold text-sm">{firstStatus.user.name}</p>
              <p className="text-xs text-gray-500">
                {new Date(firstStatus.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
