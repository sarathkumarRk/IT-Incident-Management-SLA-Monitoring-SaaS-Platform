import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Bell,
  Check,
  CheckCheck,
  RefreshCw,
  Mail,
  MailOpen,
  Filter,
  AlertCircle,
} from "lucide-react";
import API from "../../api/axios";

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNotificationTitle(notification) {
  return (
    notification.title ||
    notification.subject ||
    notification.type ||
    "Notification"
  );
}

function getNotificationMessage(notification) {
  return (
    notification.message ||
    notification.description ||
    notification.body ||
    "You have a new notification."
  );
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await API.get("/notifications/unread-count");
      setUnreadCount(Number(response.data?.unread_count ?? 0));
    } catch {
      // Keep the page usable if the unread-count request fails.
    }
  }, []);

  const fetchNotifications = useCallback(
    async (showToast = false) => {
      setRefreshing(true);
      setError("");

      try {
        const [notificationResult, countResult] =
          await Promise.allSettled([
            API.get("/notifications/", {
              params: {
                page,
                limit,
                unread_only: unreadOnly,
              },
            }),
            API.get("/notifications/unread-count"),
          ]);

        if (notificationResult.status === "rejected") {
          throw notificationResult.reason;
        }

        const data = notificationResult.value.data;

        setNotifications(Array.isArray(data) ? data : []);

        if (countResult.status === "fulfilled") {
          setUnreadCount(
            Number(countResult.value.data?.unread_count ?? 0)
          );
        }

        if (
          showToast &&
          countResult.status === "rejected"
        ) {
          toast.warning("Notifications loaded, but unread count failed.");
        } else if (showToast) {
          toast.success("Notifications refreshed.");
        }
      } catch (err) {
        const message =
          err.response?.data?.detail ||
          "Unable to load notifications.";

        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, unreadOnly]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleReadStatus = async (notification) => {
    const id = notification.id;
    const nextReadStatus = !notification.is_read;

    setUpdatingId(id);

    try {
      const response = await API.patch(
        `/notifications/${id}/read`,
        { is_read: nextReadStatus }
      );

      const updatedNotification = response.data;

      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? updatedNotification : item
        )
      );

      await fetchUnreadCount();

      toast.success(
        nextReadStatus
          ? "Notification marked as read."
          : "Notification marked as unread."
      );
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          "Unable to update notification."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      toast.info("There are no unread notifications.");
      return;
    }

    setMarkingAll(true);

    try {
      await API.patch("/notifications/read-all");

      toast.success("All notifications marked as read.");

      if (unreadOnly) {
        setNotifications([]);
      } else {
        setNotifications((current) =>
          current.map((item) => ({
            ...item,
            is_read: true,
          }))
        );
      }

      setUnreadCount(0);
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          "Unable to mark all notifications as read."
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const handleFilterChange = (value) => {
    setUnreadOnly(value);
    setPage(1);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage((current) => current - 1);
    }
  };

  const handleNextPage = () => {
    if (notifications.length === limit) {
      setPage((current) => current + 1);
    }
  };

  return (
    <div className="min-h-screen bg-green-50/50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-100 p-3">
                <Bell size={25} className="text-green-700" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-green-950 sm:text-3xl">
                  Notifications
                </h1>

                <p className="mt-1 text-sm text-green-700">
                  View and manage your incident notifications.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 font-medium text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-3">
                <Mail size={22} className="text-green-700" />
              </div>

              <div>
                <p className="text-sm font-medium text-green-700">
                  Unread Notifications
                </p>

                <p className="mt-1 text-2xl font-bold text-green-950">
                  {unreadCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-3">
                <MailOpen size={22} className="text-green-700" />
              </div>

              <div>
                <p className="text-sm font-medium text-green-700">
                  Notifications on This Page
                </p>

                <p className="mt-1 text-2xl font-bold text-green-950">
                  {notifications.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and actions */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-green-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <Filter size={19} className="text-green-700" />

            <label
              htmlFor="notification-filter"
              className="text-sm font-medium text-green-900"
            >
              Show:
            </label>

            <select
              id="notification-filter"
              value={unreadOnly ? "unread" : "all"}
              onChange={(event) =>
                handleFilterChange(event.target.value === "unread")
              }
              className="rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-green-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >
              <option value="all">All notifications</option>
              <option value="unread">Unread only</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck size={17} />
            {markingAll ? "Updating..." : "Mark all as read"}
          </button>
        </div>

        {/* Notifications list */}
        <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-green-700">
              <RefreshCw size={22} className="animate-spin" />
              <span className="font-medium">
                Loading notifications...
              </span>
            </div>
          ) : error ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 text-center">
              <AlertCircle size={35} className="text-green-700" />

              <p className="font-semibold text-green-950">
                Unable to load notifications
              </p>

              <p className="text-sm text-green-700">{error}</p>

              <button
                type="button"
                onClick={() => fetchNotifications(true)}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Try again
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <div className="rounded-full bg-green-100 p-4">
                <Bell size={30} className="text-green-700" />
              </div>

              <h2 className="mt-4 text-lg font-semibold text-green-950">
                {unreadOnly
                  ? "You're all caught up!"
                  : "No notifications yet"}
              </h2>

              <p className="mt-2 max-w-sm text-sm text-green-700">
                {unreadOnly
                  ? "You don't have any unread notifications."
                  : "Your notifications will appear here when available."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-green-100">
              {notifications.map((notification) => {
                const isRead = Boolean(notification.is_read);

                return (
                  <article
                    key={notification.id}
                    className={`p-4 transition sm:p-5 ${
                      isRead ? "bg-white" : "bg-green-50"
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="mt-1 shrink-0 rounded-full bg-green-100 p-2.5">
                        {isRead ? (
                          <MailOpen
                            size={19}
                            className="text-green-700"
                          />
                        ) : (
                          <Mail
                            size={19}
                            className="text-green-800"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words font-semibold text-green-950">
                            {getNotificationTitle(notification)}
                          </h3>

                          {!isRead && (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                              Unread
                            </span>
                          )}
                        </div>

                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-green-800">
                          {getNotificationMessage(notification)}
                        </p>

                        <p className="mt-3 text-xs text-green-700">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>

                      <button
                        type="button"
                        title={
                          isRead
                            ? "Mark as unread"
                            : "Mark as read"
                        }
                        aria-label={
                          isRead
                            ? "Mark notification as unread"
                            : "Mark notification as read"
                        }
                        disabled={updatingId === notification.id}
                        onClick={() => handleReadStatus(notification)}
                        className="shrink-0 rounded-lg border border-green-200 p-2.5 text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingId === notification.id ? (
                          <RefreshCw
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Check size={17} />
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && (
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-green-700">
              Page {page} · {notifications.length} notification(s) shown
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={page === 1 || refreshing}
                className="rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-medium text-green-800 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={notifications.length < limit || refreshing}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
