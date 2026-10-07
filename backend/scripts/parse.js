const fs = require('fs');
const ocr = `Arrays Easy Largest_element_in_array — ☐ ☐
Arrays Easy Second_largest_element_in_array — ☐ ☐
Arrays Easy Check_if_array_is_sorted_and_rotated 1752 ☐ ☐
Arrays Easy Remove_duplicates_from_sorted_array 26 ☐ ☐
Arrays Easy Rotate_array_left_by_1place 189 ☐ ☐
Arrays Easy Rotate_array_left&right_by_k_places 189 ☐ ☐
Arrays Easy Move_0's_to_end 283 ☐ ☐
Arrays Easy Linear_search 704 ☐ ☐
Arrays Easy Union_of_2_sorted_arrays — ☐ ☐
Arrays Easy Missing_number 268 ☐ ☐
Arrays Easy Max_consecutive_1's 485 ☐ ☐
Arrays Easy Longest_subarray_with_given_sum — ☐ ☐
Arrays Easy Find_element_present_only_once 136 ☐ ☐
Arrays Medium _sum_problem — ☐ ☐
Arrays Medium Sort_0_1_2 75 ☐ ☐
Arrays Medium Majority_element 169 ☐ ☐
Arrays Medium Kadane's_algorithm 53 ☐ ☐
Arrays Medium Number_of_subarray_sum_equal_k 560 ☐ ☐
Arrays Medium Stock_buy_sell 121 ☐ ☐
Arrays Medium Rearange_elements_by_sign 2149 ☐ ☐
Arrays Medium Next_permutation 31 ☐ ☐
Arrays Medium Leaders_in_array — ☐ ☐
Arrays Medium Longest_consecutive_subsequence 128 ☐ ☐
Arrays Medium Set_matrix_0's 73 ☐ ☐
Arrays Medium Rotate_matrix 48 ☐ ☐
Arrays Medium Spiral_traversal 54 ☐ ☐
Arrays Hard Pascal_triangle 118 ☐ ☐
Arrays Hard Majority_element_2 229 ☐ ☐
Arrays Hard _sum — ☐ ☐
Arrays Hard Largest_subarray_with_0sum — ☐ ☐
Arrays Hard Subarrays_with_xor_k — ☐ ☐
Arrays Hard Merge_overlapping_subinterval 56 ☐ ☐
Arrays Hard Merge_2_sorted_array_without_space 88 ☐ ☐
Arrays Hard Repeating_and_missing_numbers — ☐ ☐
Arrays Hard Count_inversions — ☐ ☐
Arrays Hard Reverse_pairs 493 ☐ ☐
Arrays Hard Maximum_product_subarray 152 ☐ ☐
Arrays Hard Longest_subarray_with_sum_k_containg_+ves_and_-ves — ☐ ☐
Binary Search 1D Arrays Find_x_in_sorted_array 704 ☐ ☐
Binary Search 1D Arrays Implement_lower_bound — ☐ ☐
Binary Search 1D Arrays Implement_lower_upper_bound — ☐ ☐
Binary Search 1D Arrays Search_insert_position 35 ☐ ☐
Binary Search 1D Arrays Check_If_array_is_sorted — ☐ ☐
Binary Search 1D Arrays First_and_last_position 34 ☐ ☐
Binary Search 1D Arrays Number_of_occurences — ☐ ☐
Binary Search 1D Arrays Find_peak_element 162 ☐ ☐
Binary Search 1D Arrays Search_in_rotated_sorted_array 33 ☐ ☐
Binary Search 1D Arrays Search_in_rotated_sorted_array_with_duplicates 81 ☐ ☐
Binary Search 2D Arrays Row_with_maximum_number_of_1's — ☐ ☐
Binary Search 2D Arrays Search_in_sorted_matrix 74 ☐ ☐
Binary Search 2D Arrays Search_in_rowwise_sorted_matrix 240 ☐ ☐
Binary Search 2D Arrays Peak_element_in_matrix 1901 ☐ ☐
Binary Search 2D Arrays Matrix_median — ☐ ☐
Binary Search In Search Space Square_root_of_number 69 ☐ ☐
Binary Search In Search Space Nth_root_of_integer — ☐ ☐
Binary Search In Search Space Koko_eating_banana 875 ☐ ☐
Binary Search In Search Space Minimum_days_to_make_boquets 1482 ☐ ☐
Binary Search In Search Space Find_smallest_integer 1283 ☐ ☐
Binary Search In Search Space Capacity_to_ship_packages 1011 ☐ ☐
Binary Search In Search Space Aggresive_cows — ☐ ☐
Binary Search In Search Space Book_allocation — ☐ ☐
Binary Search In Search Space Split_array_largest 410 ☐ ☐
Binary Search In Search Space Kth_missing_number 1539 ☐ ☐
Binary Search In Search Space Gas_station 774 ☐ ☐
Binary Search In Search Space Median_of_two_sorted_arrays 4 ☐ ☐
Strings Easy Remove_outer_parenthesis 1021 ☐ ☐
Strings Easy Reverse_words_in_string 151 ☐ ☐
Strings Easy Largest_odd_number_in_string 1903 ☐ ☐
Strings Easy Longest_common_prefix 14 ☐ ☐
Strings Easy Isomorphic_string 205 ☐ ☐
Strings Easy Check_for_rotated_string 796 ☐ ☐
Strings Easy Valid_anagram 242 ☐ ☐
Strings Medium Sort_characters_by_frequency 451 ☐ ☐
Strings Medium Max_nesting_depth_of_parenthesis 1614 ☐ ☐
Strings Medium Roman_to_Integer 13 ☐ ☐
Strings Medium Implement_atoi 8 ☐ ☐
Strings Medium Count_the_number_of_substrings_with_k_unique_characters — ☐ ☐
Strings Medium Longest_palindromic_substring 5 ☐ ☐
Strings Medium Sum_of_beauty_of_all_substrings 1781 ☐ ☐
Linked List Single Linked List Intro_to_linked_list — ☐ ☐
Linked List Single Linked List Inserting_node_to_linked_list — ☐ ☐
Linked List Single Linked List Deleting_node_in_linked_list — ☐ ☐
Linked List Single Linked List Count_the_number_of_nodes_linked_list — ☐ ☐
Linked List Single Linked List Search_element_in_linked_list — ☐ ☐
Linked List Doubly Linked List Introduction_to_Double_LL — ☐ ☐
Linked List Doubly Linked List Insert_node_in_DLL — ☐ ☐
Linked List Doubly Linked List Delete_node_in_DLL — ☐ ☐
Linked List Doubly Linked List Reverse_DLL — ☐ ☐
Linked List Medium Problems of LL Find_mid_of_LL 876 ☐ ☐
Linked List Medium Problems of LL Reverse_LL 206 ☐ ☐
Linked List Medium Problems of LL Detect_loop_in_LL 141 ☐ ☐
Linked List Medium Problems of LL Start_of_cycle_in_LL 142 ☐ ☐
Linked List Medium Problems of LL Count_nodes_in_loop — ☐ ☐
Linked List Medium Problems of LL Check_for_palindrome_LL 234 ☐ ☐
Linked List Medium Problems of LL Odd_even_LL 328 ☐ ☐
Linked List Medium Problems of LL Delete_nth_node_from_back 19 ☐ ☐
Linked List Medium Problems of LL Delete_mid_of_LL 2095 ☐ ☐
Linked List Medium Problems of LL Sort_LL 148 ☐ ☐
Linked List Medium Problems of LL Sort_0_1_2_in_LL — ☐ ☐
Linked List Medium Problems of LL Add_1_to_LL 369 ☐ ☐
Linked List Medium Problems of LL Add_two_LL 2 ☐ ☐
Linked List Medium Problems of DLL Delete_nodes_from_dll — ☐ ☐
Linked List Medium Problems of DLL Pair_sum_in_dll — ☐ ☐
Linked List Medium Problems of DLL Remove_duplicates_from_dll — ☐ ☐
Linked List Hard Problems of LL Reverse_k_node_in_groups 25 ☐ ☐
Linked List Hard Problems of LL Rotate_LL_k_times 61 ☐ ☐
Linked List Hard Problems of LL Copy_LL_with_random_pointers 138 ☐ ☐
Linked List Hard Problems of LL Flatten_LL 430 ☐ ☐
Recursion Get Strong Hold Implement_atoi_via_recursion 8 ☐ ☐
Recursion Get Strong Hold Count_good_numbers 1922 ☐ ☐
Recursion Get Strong Hold Reverse_stack_using_recursion — ☐ ☐
Recursion Get Strong Hold Sort_stack_using_recursion — ☐ ☐
Recursion Subsequences Pattern Genereate all valid parenthesis 22 ☐ ☐
Recursion Subsequences Pattern Power set 78 ☐ ☐
Recursion Subsequences Pattern Count distinct substrings — ☐ ☐
Recursion Subsequences Pattern Count subsets with sum equal to k — ☐ ☐
Recursion Subsequences Pattern Subset 1 78 ☐ ☐
Recursion Subsequences Pattern Subset 2 90 ☐ ☐
Recursion Subsequences Pattern Combination Sum 1 39 ☐ ☐
Recursion Subsequences Pattern Combination Sum 2 40 ☐ ☐
Recursion Subsequences Pattern Combination Sum 3 216 ☐ ☐
Recursion Subsequences Pattern Letter combinations of phone 17 ☐ ☐
Recursion Try Out All Combos Palindrome partioning 131 ☐ ☐
Recursion Try Out All Combos Word search in grid 79 ☐ ☐
Recursion Try Out All Combos Rat in maze — ☐ ☐
Recursion Try Out All Combos M coloring problem — ☐ ☐
Recursion Try Out All Combos N queens 51 ☐ ☐
Recursion Try Out All Combos Word Break 139 ☐ ☐
Recursion Try Out All Combos Sudoku solver 37 ☐ ☐
Bit Manipulation Learn Bit Manipulation Bit Manipulation — ☐ ☐
Bit Manipulation Learn Bit Manipulation Check for the ith bit — ☐ ☐
Bit Manipulation Learn Bit Manipulation Check for odd even — ☐ ☐
Bit Manipulation Learn Bit Manipulation Check for the power of 2 231 ☐ ☐
Bit Manipulation Learn Bit Manipulation Set the righmost unset bit — ☐ ☐
Bit Manipulation Learn Bit Manipulation Swap two numbers without temporary variable — ☐ ☐
Bit Manipulation Learn Bit Manipulation Divide two numbers using bit maipulation 29 ☐ ☐
Bit Manipulation Learn Bit Manipulation Count set bit from numbers 1 to n 338 ☐ ☐
Bit Manipulation Interview Problems Minimum bit flips — ☐ ☐
Bit Manipulation Interview Problems Exceptionally odd — ☐ ☐
Bit Manipulation Interview Problems XOR of numbers from L to R — ☐ ☐
Bit Manipulation Advanced Maths Prime factors of number — ☐ ☐
Bit Manipulation Advanced Maths All divisors of number — ☐ ☐
Bit Manipulation Advanced Maths Sieve of Eratosthenes — ☐ ☐
Bit Manipulation Advanced Maths Prime factorization using Sieve — ☐ ☐
Bit Manipulation Advanced Maths Fast Power 50 ☐ ☐
Stack & Queues Learning Implement stack using array — ☐ ☐
Stack & Queues Learning Implement queue using array — ☐ ☐
Stack & Queues Learning Implement stack using queue 225 ☐ ☐
Stack & Queues Learning Implement queue using stacks 232 ☐ ☐
Stack & Queues Learning Implement stack using linked list — ☐ ☐
Stack & Queues Learning Valid Parenthesis 20 ☐ ☐
Stack & Queues Learning Implement min stack 155 ☐ ☐
Stack & Queues Infix / Postfix / Prefix Infix to postfix — ☐ ☐
Stack & Queues Infix / Postfix / Prefix Infix to prefix — ☐ ☐
Stack & Queues Infix / Postfix / Prefix Prefix to infix — ☐ ☐
Stack & Queues Infix / Postfix / Prefix Prefix to postfix — ☐ ☐
Stack & Queues Infix / Postfix / Prefix Postfix to infix — ☐ ☐
Stack & Queues Infix / Postfix / Prefix Postfix to prefix — ☐ ☐
Stack & Queues Monotonic Stack & Queue Next Greater Element 496 ☐ ☐
Stack & Queues Monotonic Stack & Queue Next Greater Element 2 503 ☐ ☐
Stack & Queues Monotonic Stack & Queue Previous Smaller Element — ☐ ☐
Stack & Queues Monotonic Stack & Queue Trapping Rainwater 42 ☐ ☐
Stack & Queues Monotonic Stack & Queue Sum of subarray minimum 907 ☐ ☐
Stack & Queues Monotonic Stack & Queue Sum of range of all subarray 2104 ☐ ☐
Stack & Queues Monotonic Stack & Queue Remove K elements 402 ☐ ☐
Stack & Queues Monotonic Stack & Queue Largest Rectangle in Histogram 84 ☐ ☐
Stack & Queues Monotonic Stack & Queue Maximal Rectangle in binary matrix 85 ☐ ☐
Stack & Queues Monotonic Stack & Queue Asteroids Collision 735 ☐ ☐
Stack & Queues Implementation Sliding window maximum 239 ☐ ☐
Stack & Queues Implementation Stock span problem — ☐ ☐
Stack & Queues Implementation Celebrity Problem — ☐ ☐
Stack & Queues Implementation LRU Cache 146 ☐ ☐
Sliding Window Medium Longest Substring Without Repeating Characters 3 ☐ ☐
Sliding Window Medium Max Consecutive 1's 485 ☐ ☐
Sliding Window Medium Fruit into Baskets 904 ☐ ☐
Sliding Window Medium Longest Repeating Character 424 ☐ ☐
Sliding Window Medium Binary Subarrays with Sum 930 ☐ ☐
Sliding Window Medium Count the number of nice subarrays 1248 ☐ ☐
Sliding Window Medium Number of Substrings Containing all 3 characters 1358 ☐ ☐
Sliding Window Medium Maximum Points you can obtaln form the card 1423 ☐ ☐
Sliding Window Hard Longest Substring with at most K unique characters — ☐ ☐
Sliding Window Hard Count the number of substrings with exactly K unique characters — ☐ ☐
Sliding Window Hard Minimum Window Substring 76 ☐ ☐
Heaps Learning Implement min heap — ☐ ☐
Heaps Learning Check if array is heap — ☐ ☐
Heaps Learning Convert min heap to max heap — ☐ ☐
Heaps Medium Kth largest element 215 ☐ ☐
Heaps Medium Kth smallest element — ☐ ☐
Heaps Medium Merge K sorted arrays — ☐ ☐
Heaps Medium Merge K sorted Lists 23 ☐ ☐
Heaps Medium Arrange by rank — ☐ ☐
Heaps Medium Task Scheduler 621 ☐ ☐
Heaps Medium Divide array into sets of K consecutive number 1296 ☐ ☐
Heaps Hard Design Twitter 355 ☐ ☐
Heaps Hard Minimum Cost to join n ropes — ☐ ☐
Heaps Hard Kth largest element in stream 703 ☐ ☐
Heaps Hard Maximum K sum combinations — ☐ ☐
Heaps Hard Median in a stream 295 ☐ ☐
Heaps Hard Top K frequent elements 347 ☐ ☐
Greedy Easy Assign Cookies 455 ☐ ☐
Greedy Easy Fractional Knapsack — ☐ ☐
Greedy Easy Lemonade Exchange 860 ☐ ☐
Greedy Easy Valid Parenthesis String 678 ☐ ☐
Greedy Medium N Meetings in one room — ☐ ☐
Greedy Medium Jump Game 55 ☐ ☐
Greedy Medium Jump Game 2 45 ☐ ☐
Greedy Medium Minimum Platforms — ☐ ☐
Greedy Medium Job Sequencing Problem — ☐ ☐
Greedy Medium Candy 135 ☐ ☐
Greedy Medium Insert Interval 57 ☐ ☐
Binary Trees Traversals Introduction to trees — ☐ ☐
Binary Trees Traversals Binary Tree representation — ☐ ☐
Binary Trees Traversals Preorder Traversal — ☐ ☐
Binary Trees Traversals Inorder Traversal — ☐ ☐
Binary Trees Traversals Postorder Traversal — ☐ ☐
Binary Trees Traversals Level Order Traversal — ☐ ☐
Binary Trees Medium Height of binary tree 104 ☐ ☐
Binary Trees Medium Balanced Binary Tree 110 ☐ ☐
Binary Trees Medium Diameter of Binary Tree 543 ☐ ☐
Binary Trees Medium Maximum Path Sum 124 ☐ ☐
Binary Trees Medium Same Tree 100 ☐ ☐
Binary Trees Medium Zig-Zag Traversal 103 ☐ ☐
Binary Trees Hard All root to leaf paths — ☐ ☐
Binary Trees Hard Lowest Common Ancestor 236 ☐ ☐
Binary Trees Hard Max width of binary tree 662 ☐ ☐
Binary Trees Hard Check children sum property — ☐ ☐
Binary Trees Hard All nodes at distance K 863 ☐ ☐
Binary Search Trees Concept Intro to BST — ☐ ☐
Binary Search Trees Concept Search in BST 700 ☐ ☐
Binary Search Trees Concept Minimum value in BST — ☐ ☐
Binary Search Trees Practice Problems Ceil in BST — ☐ ☐
Binary Search Trees Practice Problems Floor in BST — ☐ ☐
Binary Search Trees Practice Problems Insert into BST 701 ☐ ☐
Binary Search Trees Practice Problems Delete from BST 450 ☐ ☐
Binary Search Trees Practice Problems Kth smallest element in BST 230 ☐ ☐
Binary Search Trees Practice Problems Validate BST 98 ☐ ☐
Binary Search Trees Practice Problems LCA in BST 235 ☐ ☐
Graphs Learning Count the number of graphs — ☐ ☐
Graphs Learning Graph Representation — ☐ ☐
Graphs Learning BFS — ☐ ☐
Graphs Learning DFS — ☐ ☐
Graphs Traversal Problems Count the number of provinces 547 ☐ ☐
Graphs Traversal Problems Rotten Oranges 994 ☐ ☐
Graphs Traversal Problems Flood-Fill Algorithm 733 ☐ ☐
Graphs Traversal Problems Detect Cycle in Undirected Graph — ☐ ☐
Graphs Traversal Problems Matrix — ☐ ☐
Graphs Traversal Problems Surrounded Regions 130 ☐ ☐
Graphs Topo Sort Problems Topological Sorting — ☐ ☐
Graphs Topo Sort Problems Kahn's Algorithm — ☐ ☐
Graphs Topo Sort Problems Course Scheduler 1 207 ☐ ☐
Graphs Topo Sort Problems Course Scheduler 2 210 ☐ ☐
Graphs Topo Sort Problems Find Eventual Safe State 802 ☐ ☐
Graphs Topo Sort Problems Alien Dictonary — ☐ ☐
Graphs Shortest Path Problems Shortest path in Undirected Graph having unit distance — ☐ ☐
Graphs Shortest Path Problems Shortest path in DAG — ☐ ☐
Graphs Shortest Path Problems Dijkstra's Algorithm — ☐ ☐
Graphs Shortest Path Problems Shortest Path in binary matrix 1091 ☐ ☐
Graphs Shortest Path Problems Path with minimum effort 1631 ☐ ☐
Graphs MST Problems Prim's Algorithm — ☐ ☐
Graphs MST Problems Kruskal's Algorithm — ☐ ☐
Graphs MST Problems Number of Operations to make Network 1319 ☐ ☐
Graphs MST Problems Most stones removed 947 ☐ ☐
Graphs MST Problems Account Merge 721 ☐ ☐
Graphs MST Problems Number of islands 2 305 ☐ ☐
Graphs Other Algorithms Bridges in graph — ☐ ☐
Graphs Other Algorithms Strongly Connected Components — ☐ ☐
Dynamic Programming Intro to DP Find the nth fibonacci number 509 ☐ ☐
Dynamic Programming 1D DP Climbing Stairs 70 ☐ ☐
Dynamic Programming 1D DP Frog Jump 403 ☐ ☐
Dynamic Programming 1D DP Frog K Jumps — ☐ ☐
Dynamic Programming 1D DP House Robber 198 ☐ ☐
Dynamic Programming 1D DP House Robber 2 213 ☐ ☐
Dynamic Programming 2D DP Ninja Training — ☐ ☐
Dynamic Programming 2D DP Unique Paths 62 ☐ ☐
Dynamic Programming 2D DP Unique Paths 2 63 ☐ ☐
Dynamic Programming 2D DP Minimum Path Sum 64 ☐ ☐
Dynamic Programming 2D DP Minimum Path in Triangle 120 ☐ ☐
Dynamic Programming 2D DP Minimum Falling Path Sum 931 ☐ ☐
Dynamic Programming DP on Subsequences Subset sum equal to k — ☐ ☐
Dynamic Programming DP on Subsequences Partition array in two equal sum subsets 416 ☐ ☐
Dynamic Programming DP on Subsequences Minimum Sum Partition — ☐ ☐
Dynamic Programming DP on Subsequences Count number of subsets with sum K — ☐ ☐
Dynamic Programming DP on Subsequences Partition with given difference — ☐ ☐
Dynamic Programming DP on Strings Longest Common Subsequence 1143 ☐ ☐
Dynamic Programming DP on Strings Print the LCS 1143 ☐ ☐
Dynamic Programming DP on Strings Longest Common Substring — ☐ ☐
Dynamic Programming DP on Strings Longest Palindromic Subsequence 516 ☐ ☐
Dynamic Programming DP on Strings Minimum steps to make string palindrome 1312 ☐ ☐
Dynamic Programming DP on Stocks Best time to buy and sell stocks 121 ☐ ☐
Dynamic Programming DP on Stocks Best time to buy and sell stock 2 122 ☐ ☐
Dynamic Programming DP on Stocks Best time to buy and sell stock upto 2 transaction 123 ☐ ☐
Dynamic Programming DP on Stocks Best time to buy and sell stock uoto k transaction 188 ☐ ☐
Dynamic Programming DP on LIS Longest Increasing Subsequence 300 ☐ ☐
Dynamic Programming DP on LIS Print LIS 300 ☐ ☐
Dynamic Programming DP on LIS Largest Divisible Subset 368 ☐ ☐
Dynamic Programming DP on LIS Longest Bitonic Subsequence — ☐ ☐
Dynamic Programming DP on LIS Number of LIS 673 ☐ ☐
Dynamic Programming DP on Partition MCM — ☐ ☐
Dynamic Programming DP on Partition Minimum cost to cut stick 1547 ☐ ☐
Dynamic Programming DP on Partition Burst Ballons 312 ☐ ☐
Dynamic Programming DP on Partition Palindorme Partionting 2 132 ☐ ☐
Dynamic Programming DP on Partition Partition array for maximum sum 1043 ☐ ☐
Dynamic Programming DP on Squares Maximal Square 221 ☐ ☐
Dynamic Programming DP on Squares Count square submatrices 1277 ☐ ☐
Tries Theory Implement Trie (Prefix Tree) 208 ☐ ☐
Tries Problems Implement Trie 2 — ☐ ☐
Tries Problems Complete String — ☐ ☐
Tries Problems Count distinct subsitrings — ☐ ☐
Tries Problems Bitwise basic operations — ☐ ☐
Tries Problems Maximum XOR of two numbers 421 ☐ ☐`;

const topics = ['Arrays', 'Binary Search Trees', 'Binary Search', 'Strings', 'Linked List', 'Recursion', 'Bit Manipulation', 'Stack & Queues', 'Sliding Window', 'Heaps', 'Greedy', 'Binary Trees', 'Graphs', 'Dynamic Programming', 'Tries'];

const problems = ocr.split('\n').filter(l => l.trim()).map(line => {
  let topic = topics.find(t => line.startsWith(t));
  if (!topic) topic = 'Other';
  
  const withoutTopic = line.substring(topic.length).trim();
  const tokens = withoutTopic.split(' ');
  // Ignore last two tokens (☐ ☐)
  const leetcode = tokens[tokens.length - 3];
  const program = tokens[tokens.length - 4];
  
  const sectionTokens = tokens.slice(0, tokens.length - 4);
  const section = sectionTokens.join(' ');
  
  let difficulty = 'Medium';
  if (section.toLowerCase().includes('easy')) difficulty = 'Easy';
  if (section.toLowerCase().includes('hard')) difficulty = 'Hard';
  
  return {
    topic,
    section,
    name: program.replace(/_/g, ' '),
    leetcodeNo: leetcode === '—' ? null : leetcode,
    difficulty
  };
});

fs.writeFileSync('scripts/dsa_problems.json', JSON.stringify(problems, null, 2));
console.log('Generated ' + problems.length + ' problems');
