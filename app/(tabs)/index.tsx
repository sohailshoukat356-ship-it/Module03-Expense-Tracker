
import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Expense = {
  id: string;
  name: string;
  amount: number;
  category: string;
};

const STORAGE_KEY = "my_expenses";

const categories = [
  "Food",
  "Transport",
  "Shopping",
  "Education",
  "Other",
];

const filterCategories = ["All", ...categories];

export default function HomeScreen() {
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Search and filter states
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  // Edit expense states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");

  // Load saved expenses
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const savedData = await AsyncStorage.getItem(STORAGE_KEY);

        if (savedData !== null) {
          const oldExpenses = JSON.parse(savedData);

          const updatedExpenses = oldExpenses.map((item: any) => ({
            ...item,
            category: item.category || "Other",
          }));

          setExpenses(updatedExpenses);
        }
      } catch (error) {
        console.log("Error loading expenses:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadExpenses();
  }, []);

  // Save expenses
  useEffect(() => {
    if (!isLoaded) return;

    const saveExpenses = async () => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(expenses)
        );
      } catch (error) {
        console.log("Error saving expenses:", error);
      }
    };

    saveExpenses();
  }, [expenses, isLoaded]);

  // Calculate total
  const total = expenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  // Search and filter expenses
  const filteredExpenses = expenses.filter((item) => {
    const search = searchText.trim().toLowerCase();

    const matchesSearch =
      item.name.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search);

    const matchesCategory =
      selectedFilter === "All" ||
      item.category === selectedFilter;

    return matchesSearch && matchesCategory;
  });

  // Add expense
  const addExpense = () => {
    if (expenseName.trim() === "" || amount.trim() === "") {
      return;
    }

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    const newExpense: Expense = {
      id: Date.now().toString(),
      name: expenseName.trim(),
      amount: value,
      category: category,
    };

    setExpenses((previous) => [...previous, newExpense]);

    setExpenseName("");
    setAmount("");
    setCategory("Food");
    setSearchText("");
    setSelectedFilter("All");
  };

  // Start editing
  const startEdit = (item: Expense) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditAmount(item.amount.toString());
  };

  // Update expense
  const updateExpense = () => {
    if (editName.trim() === "" || editAmount.trim() === "") {
      return;
    }

    const value = Number(editAmount);

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    setExpenses((previous) =>
      previous.map((item) =>
        item.id === editingId
          ? {
              ...item,
              name: editName.trim(),
              amount: value,
            }
          : item
      )
    );

    setEditingId(null);
    setEditName("");
    setEditAmount("");
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditAmount("");
  };

  // Delete expense
  const deleteExpense = (id: string) => {
    setExpenses((previous) =>
      previous.filter((item) => item.id !== id)
    );

    if (editingId === id) {
      cancelEdit();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>My Expense Tracker 💰</Text>

      <Text style={styles.total}>Total: Rs. {total}</Text>

      {/* Expense Name */}
      <TextInput
        style={styles.input}
        placeholder="Enter expense name"
        value={expenseName}
        onChangeText={setExpenseName}
      />

      {/* Expense Amount */}
      <TextInput
        style={styles.input}
        placeholder="Enter amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      {/* Select Category */}
      <Text style={styles.section}>Select Category</Text>

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

      {/* Add Expense Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={addExpense}
      >
        <Text style={styles.buttonText}>Add Expense</Text>
      </TouchableOpacity>

      {/* Search Expenses */}
      <Text style={styles.section}>Search Expenses</Text>

      <TextInput
        style={styles.input}
        placeholder="Search by name or category..."
        value={searchText}
        onChangeText={setSearchText}
      />

      {/* Filter Category */}
      <Text style={styles.section}>Filter by Category</Text>

      <View style={styles.categoryContainer}>
        {filterCategories.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.categoryButton,
              selectedFilter === item && styles.selectedCategory,
            ]}
            onPress={() => setSelectedFilter(item)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedFilter === item &&
                  styles.selectedCategoryText,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* My Expenses */}
      <Text style={styles.section}>My Expenses</Text>

      {filteredExpenses.length === 0 ? (
        <Text style={styles.emptyText}>
          No matching expenses found!
        </Text>
      ) : (
        filteredExpenses.map((item) => (
          <View style={styles.card} key={item.id}>
            <View style={styles.details}>
              {editingId === item.id ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    placeholder="Expense name"
                    value={editName}
                    onChangeText={setEditName}
                  />

                  <TextInput
                    style={styles.editInput}
                    placeholder="Amount"
                    keyboardType="numeric"
                    value={editAmount}
                    onChangeText={setEditAmount}
                  />

                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.updateButton}
                      onPress={updateExpense}
                    >
                      <Text style={styles.actionText}>Update</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={cancelEdit}
                    >
                      <Text style={styles.actionText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.expenseName}>
                    {item.name}
                  </Text>

                  <Text style={styles.categoryLabel}>
                    {item.category || "Other"}
                  </Text>

                  <Text style={styles.expenseAmount}>
                    Rs. {item.amount}
                  </Text>
                </>
              )}
            </View>

            {/* Edit and Delete Buttons */}
            {editingId !== item.id && (
              <View style={styles.actionContainer}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => startEdit(item)}
                >
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteExpense(item.id)}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },

  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },

  heading: {
    fontSize: 25,
    fontWeight: "bold",
    marginBottom: 20,
  },

  total: {
    fontSize: 22,
    fontWeight: "bold",
    color: "green",
    marginBottom: 20,
  },

  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 16,
  },

  section: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 12,
  },

  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15,
  },

  categoryButton: {
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },

  selectedCategory: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  categoryText: {
    color: "#333",
    fontWeight: "bold",
  },

  selectedCategoryText: {
    color: "white",
  },

  button: {
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },

  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  details: {
    flex: 1,
  },

  expenseName: {
    fontSize: 16,
    fontWeight: "bold",
  },

  categoryLabel: {
    color: "#2563EB",
    marginTop: 4,
  },

  expenseAmount: {
    fontSize: 16,
    color: "green",
    fontWeight: "bold",
    marginTop: 5,
  },

  deleteButton: {
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
  },

  deleteText: {
    color: "red",
    fontWeight: "bold",
  },

  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
  },

  actionContainer: {
    gap: 8,
    marginLeft: 10,
  },

  editButton: {
    backgroundColor: "#DBEAFE",
    padding: 10,
    borderRadius: 8,
  },

  editText: {
    color: "#2563EB",
    fontWeight: "bold",
  },

  editInput: {
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 15,
  },

  editActions: {
    flexDirection: "row",
    gap: 8,
  },

  updateButton: {
    backgroundColor: "#16A34A",
    padding: 10,
    borderRadius: 8,
  },

  cancelButton: {
    backgroundColor: "#6B7280",
    padding: 10,
    borderRadius: 8,
  },

  actionText: {
    color: "white",
    fontWeight: "bold",
  },
});
