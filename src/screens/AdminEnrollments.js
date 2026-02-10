import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../utils/supabase";

export default function AdminEnrollments({ navigation }) {
  const { colors } = useTheme();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchPaidEnrollments() {
      setLoading(true);
      const { data, error } = await supabase
        .from("enrollments")
        .select(`id, price_paid, enrolled_at, users(id, name, email), courses(id, title)`)
        .eq("payment_status", "paid")
        .order("enrolled_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        setError(error.message || "Error fetching enrollments");
        setEnrollments([]);
      } else {
        setEnrollments(data || []);
        setError(null);
      }

      setLoading(false);
    }

    fetchPaidEnrollments();

    return () => {
      mounted = false;
    };
  }, []);

  function renderItem({ item }) {
    const user = item.users || { name: "-", email: "-" };
    const course = item.courses || { title: "-" };

    const getInitials = (name = "") =>
      name
        .split(" ")
        .map((p) => p[0] || "")
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const formatCurrency = (v) => {
      try {
        return Number(v).toLocaleString(undefined, { style: "currency", currency: "USD" });
      } catch (e) {
        return String(v);
      }
    };

    const formatDate = (d) => {
      try {
        return new Date(d).toLocaleString();
      } catch (e) {
        return String(d || "-");
      }
    };

    return (
      <TouchableOpacity style={[styles.item, { borderColor: colors.border }]} activeOpacity={0.9}>
        <View style={styles.row}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{user.name}</Text>
          <Text style={[styles.price, { color: colors.primary }]}>{formatCurrency(item.price_paid)}</Text>
        </View>

        <Text style={[styles.itemSubtitle, { color: colors.textSecondary, marginTop: 6 }]} numberOfLines={1}>{user.email}</Text>

        <View style={styles.rowMeta}>
          <View style={[styles.courseBadge, { borderColor: colors.primary }]}> 
            <Text style={[styles.courseBadgeText, { color: colors.primary }]} numberOfLines={1}>{course.title}</Text>
          </View>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{formatDate(item.enrolled_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.title, { color: colors.text }]}>Panel de Inscripciones</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
      ) : error ? (
        <Text style={{ color: colors.error, marginTop: 20 }}>{error}</Text>
      ) : (
        <FlatList
          data={enrollments}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 12 }}
          ListEmptyComponent={() => (
            <Text style={{ color: colors.textSecondary, marginTop: 20 }}>No hay inscripciones pagadas.</Text>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 20,
    alignItems: "stretch",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  item: {
    width: "100%",
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: 8,
    backgroundColor: "transparent",
    flexDirection: "column",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  itemSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    width: "100%",
  },
  courseBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  courseBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  courseTitle: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: "600",
  },
  meta: {
    fontSize: 12,
    marginTop: 6,
  },
});