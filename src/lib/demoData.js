import { makeId } from "./storage";

function iso(year, month, day) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Builds a realistic month + a full previous month so the dashboard can show
 * category breakdown, month comparison, forecast and insights immediately.
 * Anchored to "today" so the demo looks sensible whenever it's loaded.
 */
export function buildDemoState() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = now.getDate();

  const prevAnchor = new Date(y, m - 1, 1);
  const py = prevAnchor.getFullYear();
  const pm = prevAnchor.getMonth();

  const expenses = [];
  const add = (year, month, day, category, shop, amount, isRecurring = false) => {
    expenses.push({
      id: makeId(),
      date: iso(year, month + 1, day),
      category,
      shop,
      amount,
      isRecurring,
    });
  };

  // previous month — full, so comparisons and recurring detection have data
  add(py, pm, 3, "Rent", "Landlord", 16000, true);
  add(py, pm, 2, "Mobile", "Grameenphone", 600, true);
  add(py, pm, 5, "Utilities", "DESCO", 2400, true);
  add(py, pm, 6, "Education", "British Council", 5800, true);
  add(py, pm, 1, "Groceries", "Agora", 3200);
  add(py, pm, 9, "Groceries", "Shwapno", 2100);
  add(py, pm, 18, "Groceries", "Agora", 2800);
  add(py, pm, 2, "Food", "Chillox", 450);
  add(py, pm, 4, "Food", "Foodpanda", 380);
  add(py, pm, 7, "Food", "Panda Garden", 620);
  add(py, pm, 10, "Food", "Chillox", 410);
  add(py, pm, 13, "Food", "Foodpanda", 520);
  add(py, pm, 16, "Food", "Star Kabab", 690);
  add(py, pm, 20, "Food", "Chillox", 470);
  add(py, pm, 24, "Food", "Foodpanda", 540);
  add(py, pm, 3, "Transport", "Uber", 220);
  add(py, pm, 6, "Transport", "Pathao", 180);
  add(py, pm, 11, "Transport", "Uber", 310);
  add(py, pm, 15, "Transport", "CNG", 150);
  add(py, pm, 19, "Transport", "Uber", 260);
  add(py, pm, 23, "Transport", "Pathao", 210);
  add(py, pm, 8, "Entertainment", "Star Cineplex", 700);
  add(py, pm, 14, "Health", "Lazz Pharma", 550);
  add(py, pm, 22, "Clothing", "Yellow", 1800);

  // current month up to today
  const upTo = (day) => today >= day;
  add(y, m, 3, "Rent", "Landlord", 16000, true);
  add(y, m, 2, "Mobile", "Grameenphone", 600, true);
  if (upTo(5)) add(y, m, 5, "Utilities", "DESCO", 2600, true);
  if (upTo(6)) add(y, m, 6, "Education", "British Council", 5800, true);
  if (upTo(1)) add(y, m, 1, "Groceries", "Agora", 3400);
  if (upTo(9)) add(y, m, 9, "Groceries", "Shwapno", 2300);
  if (upTo(18)) add(y, m, 18, "Groceries", "Agora", 3100);
  if (upTo(2)) add(y, m, 2, "Food", "Chillox", 480);
  if (upTo(4)) add(y, m, 4, "Food", "Foodpanda", 620);
  if (upTo(7)) add(y, m, 7, "Food", "Panda Garden", 780);
  if (upTo(10)) add(y, m, 10, "Food", "Chillox", 450);
  if (upTo(13)) add(y, m, 13, "Food", "Foodpanda", 710);
  if (upTo(16)) add(y, m, 16, "Food", "Star Kabab", 820);
  if (upTo(19)) add(y, m, 19, "Food", "Chillox", 690);
  if (upTo(22)) add(y, m, 22, "Food", "Foodpanda", 640);
  if (upTo(25)) add(y, m, 25, "Food", "Panda Garden", 710);
  if (upTo(3)) add(y, m, 3, "Transport", "Uber", 240);
  if (upTo(6)) add(y, m, 6, "Transport", "Pathao", 190);
  if (upTo(11)) add(y, m, 11, "Transport", "Uber", 330);
  if (upTo(15)) add(y, m, 15, "Transport", "CNG", 160);
  if (upTo(19)) add(y, m, 19, "Transport", "Uber", 280);
  if (upTo(24)) add(y, m, 24, "Transport", "Uber", 300);
  if (upTo(12)) add(y, m, 12, "Health", "Lazz Pharma", 480);
  if (upTo(17)) add(y, m, 17, "Entertainment", "Star Cineplex", 750);
  if (upTo(21)) add(y, m, 21, "Clothing", "Yellow", 2200);

  const pockets = [
    {
      id: makeId(),
      name: "Laptop",
      item: "MacBook Air M4",
      target: 120000,
      currentBalance: 20000,
      monthlyContribution: 10000,
    },
    {
      id: makeId(),
      name: "Trip",
      item: "Cox's Bazar weekend",
      target: 30000,
      currentBalance: 6000,
      monthlyContribution: 5000,
    },
    {
      id: makeId(),
      name: "Emergency fund",
      item: "3-month safety net",
      target: 150000,
      currentBalance: 35000,
      monthlyContribution: 8000,
    },
  ];

  return {
    salary: 65000,
    expenses,
    pockets,
    dpsAnnualRatePercent: 8,
  };
}
