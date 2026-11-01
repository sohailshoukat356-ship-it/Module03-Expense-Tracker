
import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../../config/firebase";
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

type Expense = {
  id: string;
  name: string;
  amount: number;
  category: string;
  createdAt?: Date | Timestamp | { toDate: () => Date };
};

const categories = ["Food", "Transport", "Shopping", "Education", "Other"];
const filterCategories = ["All", ...categories];

const categoryIcons: Record<string, string> = {
  Food: "🍔",
  Transport: "🚗",
  Shopping: "🛍️",
  Education: "📚",
  Other: "📌",
};

const getExpenseDate = (expense: Expense): Date => {
  const value = expense.createdAt;

  if (value instanceof Date) return value;

  if (value && typeof value === "object" && "toDate" in value) {
    return value.toDate();
  }

  return new Date(0);
};

const isSameMonth = (date: Date, year: number, month: number) =>
  date.getFullYear() === year && date.getMonth() === month;

export default function HomeScreen() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);

      if (!currentUser) {
        router.replace("/(auth)/login");
      }
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!authChecked || !user) return;

    setIsLoaded(false);

    const expensesRef = collection(db, "users", user.uid, "expenses");

    const unsubscribe = onSnapshot(
      expensesRef,
      (snapshot) => {
        const loadedExpenses = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Expense[];

        setExpenses(loadedExpenses);
        setIsLoaded(true);
      },
      (error) => {
        console.log("Firebase loading error:", error);
        Alert.alert("Error", "Could not load expenses.");
        setIsLoaded(true);
      }
    );

    return unsubscribe;
  }, [authChecked, user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert("Error", "Logout failed.");
    }
  };

  // Overall and monthly calculations
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const previousYear = previousMonthDate.getFullYear();
  const previousMonth = previousMonthDate.getMonth();

  const total = expenses.reduce((sum, item) => sum + item.amount, 0);

  const currentMonthExpenses = expenses.filter((item) =>
    isSameMonth(getExpenseDate(item), currentYear, currentMonth)
  );

  const previousMonthExpenses = expenses.filter((item) =>
    isSameMonth(getExpenseDate(item), previousYear, previousMonth)
  );

  const currentMonthTotal = currentMonthExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const previousMonthTotal = previousMonthExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const categoryTotals = categories.map((item) => {
    const categoryTotal = currentMonthExpenses
      .filter((expense) => expense.category === item)
      .reduce((sum, expense) => sum + expense.amount, 0);

    return { name: item, amount: categoryTotal };
  });

  const maxCategoryTotal = Math.max(
    ...categoryTotals.map((item) => item.amount),
    1
  );

  const monthName = now.toLocaleString("en-US", { month: "long" });
  const previousMonthName = previousMonthDate.toLocaleString("en-US", {
    month: "long",
  });

  const filteredExpenses = expenses.filter((item) => {
    const search = searchText.trim().toLowerCase();

    const matchesSearch =
      item.name.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search);

    const matchesCategory =
      selectedFilter === "All" || item.category === selectedFilter;

    return matchesSearch && matchesCategory;
  });

  const addExpense = async () => {
    if (!expenseName.trim() || !amount.trim()) {
      Alert.alert("Missing Information", "Please enter expense name and amount.");
      return;
    }

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    if (!user) return;

    try {
      await addDoc(collection(db, "users", user.uid, "expenses"), {
        name: expenseName.trim(),
        amount: value,
        category,
        createdAt: new Date(),
      });

      setExpenseName("");
      setAmount("");
      setCategory("Food");
      Alert.alert("Success", "Expense added successfully!");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Could not add expense.");
    }
  };

  const startEdit = (item: Expense) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditAmount(item.amount.toString());
  };

  const updateExpense = async () => {
    if (!editName.trim() || !editAmount.trim()) {
      Alert.alert("Error", "Please enter name and amount.");
      return;
    }

    const value = Number(editAmount);

    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    if (!user || !editingId) return;

    try {
      await updateDoc(doc(db, "users", user.uid, "expenses", editingId), {
        name: editName.trim(),
        amount: value,
      });

      setEditingId(null);
      setEditName("");
      setEditAmount("");
      Alert.alert("Success", "Expense updated!");
    } catch (error) {
      Alert.alert("Error", "Could not update expense.");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditAmount("");
  };

  const deleteExpense = (id: string) => {
    Alert.alert("Delete Expense", "Are you sure you want to delete this expense?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!user) return;

          try {
            await deleteDoc(doc(db, "users", user.uid, "expenses", id));
            if (editingId === id) cancelEdit();
          } catch (error) {
            Alert.alert("Error", "Could not delete expense.");
          }
        },
      },
    ]);
  };

  if (!authChecked || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>WELCOME BACK 👋</Text>
          <Text style={styles.heading}>My Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Overall Total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>TOTAL EXPENSES</Text>
        <Text style={styles.totalAmount}>Rs. {total.toLocaleString("en-PK")}</Text>
        <Text style={styles.totalSubtext}>
          Across {expenses.length} transactions
        </Text>
        <Text style={styles.moneyIcon}>💰</Text>
      </View>

      {/* Monthly Report */}
      <Text style={styles.sectionTitle}>Monthly Report 📊</Text>
      <Text style={styles.sectionSubtitle}>Your spending summary</Text>

      <View style={styles.monthCards}>
        <View style={styles.monthCard}>
          <Text style={styles.monthLabel}>{monthName}</Text>
          <Text style={styles.monthAmount}>
            Rs. {currentMonthTotal.toLocaleString("en-PK")}
          </Text>
          <Text style={styles.monthCaption}>This month</Text>
        </View>

        <View style={[styles.monthCard, styles.previousCard]}>
          <Text style={styles.monthLabel}>{previousMonthName}</Text>
          <Text style={styles.monthAmount}>
            Rs. {previousMonthTotal.toLocaleString("en-PK")}
          </Text>
          <Text style={styles.monthCaption}>Last month</Text>
        </View>
      </View>

      {/* Category Summary */}
      <Text style={styles.sectionTitle}>Category Summary</Text>
      <Text style={styles.sectionSubtitle}>Spending in {monthName}</Text>

      <View style={styles.reportCard}>
        {categoryTotals.map((item) => (
          <View key={item.name} style={styles.reportRow}>
            <View style={styles.reportTop}>
              <Text style={styles.reportName}>
                {categoryIcons[item.name]} {item.name}
              </Text>
              <Text style={styles.reportAmount}>
                Rs. {item.amount.toLocaleString("en-PK")}
              </Text>
            </View>
            <View style={styles.barBackground}>
              <View
                style={[
                  styles.barFill,
                  { width: `${(item.amount / maxCategoryTotal) * 100}%` },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Add Expense */}
      <Text style={styles.sectionTitle}>Add New Expense</Text>
      <Text style={styles.sectionSubtitle}>Record your spending</Text>

      <View style={styles.formCard}>
        <Text style={styles.inputLabel}>Expense Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Lunch, Petrol, Books"
          placeholderTextColor="#94A3B8"
          value={expenseName}
          onChangeText={setExpenseName}
        />

        <Text style={styles.inputLabel}>Amount (PKR)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={styles.inputLabel}>Select Category</Text>
        <View style={styles.categoryContainer}>
          {categories.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.categoryButton,
                category === item && styles.selectedCategory,
              ]}
              onPress={() => setCategory(item)}
            >
              <Text style={styles.categoryIcon}>{categoryIcons[item]}</Text>
              <Text
                style={[
                  styles.categoryText,
                  category === item && styles.selectedCategoryText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={addExpense}>
          <Text style={styles.addButtonText}>+ Add Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Expenses */}
      <Text style={styles.sectionTitle}>Recent Expenses</Text>
      <Text style={styles.sectionSubtitle}>Manage your transactions</Text>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search expenses..."
          placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {filterCategories.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.filterButton,
              selectedFilter === item && styles.selectedFilter,
            ]}
            onPress={() => setSelectedFilter(item)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === item && styles.selectedFilterText,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!isLoaded ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 25 }} />
      ) : filteredExpenses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Expenses Found</Text>
          <Text style={styles.emptyText}>Add an expense or change your search.</Text>
        </View>
      ) : (
        filteredExpenses.map((item) => (
          <View style={styles.expenseCard} key={item.id}>
            <View style={styles.expenseIconBox}>
              <Text style={styles.expenseIcon}>
                {categoryIcons[item.category] || "📌"}
              </Text>
            </View>

            <View style={styles.expenseDetails}>
              {editingId === item.id ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Expense name"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editAmount}
                    onChangeText={setEditAmount}
                    keyboardType="numeric"
                    placeholder="Amount"
                  />
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.updateButton} onPress={updateExpense}>
                      <Text style={styles.actionText}>Update</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                      <Text style={styles.actionText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.expenseName}>{item.name}</Text>
                  <Text style={styles.expenseCategory}>{item.category}</Text>
                  <Text style={styles.expenseAmount}>
                    Rs. {item.amount.toLocaleString("en-PK")}
                  </Text>
                </>
              )}
            </View>

            {editingId !== item.id && (
              <View style={styles.actionColumn}>
                <TouchableOpacity style={styles.editButton} onPress={() => startEdit(item)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteExpense(item.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}

      <Text style={styles.footer}>My Expense Tracker • Manage your money wisely</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  contentContainer: { padding: 20, paddingTop: 55, paddingBottom: 45 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F1F5F9" },
  loadingText: { marginTop: 12, color: "#64748B" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 25 },
  welcome: { fontSize: 12, color: "#64748B", fontWeight: "bold", letterSpacing: 1 },
  heading: { fontSize: 27, color: "#0F172A", fontWeight: "bold", marginTop: 5 },
  logoutButton: { backgroundColor: "#FEE2E2", paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10 },
  logoutText: { color: "#DC2626", fontWeight: "bold" },
  totalCard: { backgroundColor: "#1D4ED8", padding: 23, borderRadius: 20, marginBottom: 28, overflow: "hidden" },
  totalLabel: { color: "#DBEAFE", fontSize: 13, fontWeight: "bold", letterSpacing: 1 },
  totalAmount: { color: "#FFFFFF", fontSize: 32, fontWeight: "bold", marginTop: 12 },
  totalSubtext: { color: "#DBEAFE", marginTop: 8, fontSize: 13 },
  moneyIcon: { position: "absolute", right: 20, top: 20, fontSize: 40 },
  sectionTitle: { color: "#0F172A", fontSize: 21, fontWeight: "bold", marginTop: 22 },
  sectionSubtitle: { color: "#64748B", fontSize: 13, marginTop: 4, marginBottom: 14 },
  monthCards: { flexDirection: "row", gap: 12, marginBottom: 10 },
  monthCard: { flex: 1, backgroundColor: "#FFFFFF", padding: 15, borderRadius: 15, elevation: 2 },
  previousCard: { backgroundColor: "#E0F2FE" },
  monthLabel: { color: "#475569", fontWeight: "bold", fontSize: 14 },
  monthAmount: { color: "#1D4ED8", fontSize: 19, fontWeight: "bold", marginTop: 12 },
  monthCaption: { color: "#64748B", fontSize: 12, marginTop: 5 },
  reportCard: { backgroundColor: "#FFFFFF", padding: 17, borderRadius: 16, marginBottom: 5, elevation: 2 },
  reportRow: { marginBottom: 17 },
  reportTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  reportName: { color: "#334155", fontWeight: "bold", fontSize: 13 },
  reportAmount: { color: "#0F172A", fontWeight: "bold", fontSize: 13 },
  barBackground: { height: 9, backgroundColor: "#E2E8F0", borderRadius: 10, overflow: "hidden" },
  barFill: { height: 9, backgroundColor: "#2563EB", borderRadius: 10 },
  formCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, marginBottom: 8, elevation: 3 },
  inputLabel: { color: "#334155", fontSize: 14, fontWeight: "bold", marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", padding: 14, borderRadius: 11, fontSize: 15, color: "#0F172A" },
  categoryContainer: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 3, marginBottom: 18 },
  categoryButton: { backgroundColor: "#F1F5F9", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  selectedCategory: { backgroundColor: "#DBEAFE", borderColor: "#2563EB" },
  categoryIcon: { fontSize: 19, marginBottom: 4 },
  categoryText: { color: "#475569", fontSize: 12, fontWeight: "bold" },
  selectedCategoryText: { color: "#1D4ED8" },
  addButton: { backgroundColor: "#2563EB", padding: 16, borderRadius: 12, alignItems: "center" },
  addButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  searchBox: { backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 15 },
  searchIcon: { fontSize: 17, marginRight: 9 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 14, color: "#0F172A" },
  filterScroll: { marginBottom: 18 },
  filterButton: { backgroundColor: "#FFFFFF", paddingVertical: 9, paddingHorizontal: 17, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  selectedFilter: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  filterText: { color: "#475569", fontWeight: "bold", fontSize: 13 },
  selectedFilterText: { color: "#FFFFFF" },
  emptyCard: { backgroundColor: "#FFFFFF", padding: 30, borderRadius: 16, alignItems: "center" },
  emptyIcon: { fontSize: 35 },
  emptyTitle: { fontSize: 17, fontWeight: "bold", color: "#0F172A", marginTop: 12 },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 6 },
  expenseCard: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 15, marginBottom: 12, flexDirection: "row", alignItems: "center", elevation: 2 },
  expenseIconBox: { width: 45, height: 45, backgroundColor: "#EFF6FF", borderRadius: 13, justifyContent: "center", alignItems: "center", marginRight: 12 },
  expenseIcon: { fontSize: 22 },
  expenseDetails: { flex: 1 },
  expenseName: { color: "#0F172A", fontSize: 15, fontWeight: "bold" },
  expenseCategory: { color: "#64748B", fontSize: 12, marginTop: 4 },
  expenseAmount: { color: "#15803D", fontSize: 15, fontWeight: "bold", marginTop: 5 },
  actionColumn: { gap: 7, marginLeft: 8 },
  editButton: { backgroundColor: "#DBEAFE", paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 },
  editText: { color: "#1D4ED8", fontWeight: "bold", fontSize: 12 },
  deleteButton: { backgroundColor: "#FEE2E2", paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 },
  deleteText: { color: "#DC2626", fontWeight: "bold", fontSize: 12 },
  editInput: { backgroundColor: "#F1F5F9", padding: 9, borderRadius: 8, marginBottom: 7, color: "#0F172A" },
  actionRow: { flexDirection: "row", gap: 7 },
  updateButton: { backgroundColor: "#16A34A", padding: 9, borderRadius: 8 },
  cancelButton: { backgroundColor: "#64748B", padding: 9, borderRadius: 8 },
  actionText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12 },
  footer: { textAlign: "center", color: "#94A3B8", fontSize: 11, marginTop: 25 },
});
