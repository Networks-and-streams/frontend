/**
 * English (default / fallback) translation resources.
 *
 * Keys are structured by feature/domain:
 * - common     — app-wide strings (brand, generic loaders, dismiss, sign out)
 * - errors     — shared error/fallback messages
 * - auth       — authentication pages & form
 * - subscription — subscribe page + Google Pay
 * - graphPage  — the graph editor workspace (input, algorithm, results)
 * - savedGraphs — "My Graphs" panel and its toasts
 * - about      — About / Help page (overview, usage guide, team, user agreement)
 * - languageSwitcher — locale picker labels
 *
 * Leaf values are typed as plain `string`s intentionally: `uk.ts` is enforced
 * to have the exact same key tree with `satisfies typeof en`, and the i18next
 * resources augmentation (`shared/i18n`) derives the allowed `t()` keys from
 * this shape.
 */
export const en = {
	common: {
		appName: 'Graph Resolver',
		home: 'Home',
		workspace: 'Workspace',
		about: 'About',
		loading: 'Loading…',
		retry: 'Retry',
		dismiss: 'Dismiss',
		signOut: 'Sign out',
		checkingAccount: 'Checking your account…',
		checkingSubscription: 'Checking your subscription…',
		verifyingSubscription: 'Verifying your subscription…',
		restoringSession: 'Restoring your session…',
	},
	errors: {
		somethingWentWrong: 'Something went wrong.',
		sessionExpired: 'Your session has expired. Please sign in again.',
		failedToLoadSubscription: 'Failed to load subscription.',
		failedToLoadSavedGraphs: 'Failed to load saved graphs.',
	},
	auth: {
		welcomeBack: 'Welcome back',
		createAccount: 'Create your account',
		signInToContinue: 'Sign in to continue to your workspace.',
		registerToStart: 'Register to start solving graphs.',
		continueWithGoogle: 'Continue with Google',
		noAccount: "Don't have an account?",
		register: 'Register',
		haveAccount: 'Already have an account?',
		signIn: 'Sign in',
	},
	languageSwitcher: {
		label: 'Language',
		en: 'English',
		uk: 'Українська',
	},
	subscription: {
		title: 'Subscribe to Graph Resolver',
		description:
			'A premium subscription unlocks the full graph-solving workspace. Your subscription is linked to your account and managed through the backend payment gateway.',
		whatYouGet: 'What you get',
		features: {
			editor: 'Graph input editor with validation',
			visualization: 'Graph visualization and step-by-step results',
			algorithms: 'Minty shortest-path and Ford–Fulkerson max-flow algorithms',
			traces: 'Execution traces for algorithm analysis',
		},
		currentPlan: 'Current plan:',
		statusLabel: 'status:',
		premium: 'Premium',
		perDays: '/ {{count}} days',
		paymentNote:
			'One-time payment processed by the backend provider (Stripe). The backend determines the final amount and currency.',
		startingPayment: 'Starting your payment…',
		sendingPayment: 'Sending the payment to the backend gateway.',
		paymentProcessing: 'Payment processing',
		paymentProcessingNote: 'The provider is confirming your payment. This can take a few moments.',
		checkStatus: 'Check status',
		paymentConfirmed: 'Payment confirmed',
		verifyingSubscription: 'Verifying your subscription and unlocking the app…',
		paymentFailed: 'Payment failed',
		tryAgain: 'Try again',
		paymentCancelled: 'Payment cancelled.',
		goToApp: 'Go to the app',
		paymentDeclined: 'The payment was declined.',
		couldNotCreatePayment: 'Could not create the payment.',
		paymentProcessingFailed: 'Payment processing failed.',
		couldNotCheckStatus: 'Could not check the payment status.',
		googlePay: {
			loading: 'Loading Google Pay…',
			unavailable: 'Google Pay is not available for this device/browser right now.',
			unavailableNote:
				'Payment is processed by the backend payment gateway. Please try again later, or use a device with Google Pay support.',
			initFailed: 'Could not initialize Google Pay. Check the connection and reload the page.',
		},
	},
	graphPage: {
		subtitle: 'Solve graph problems step by step with an interactive workspace.',
		saveCard: {
			title: 'Graph',
			newTitle: 'Start a new graph',
			new: 'New',
			name: 'Name',
			namePlaceholder: 'e.g. Dijkstra test graph',
			saving: 'Saving…',
			save: 'Save',
			saveChanges: 'Save changes',
			saveAsNew: 'Save as new',
			saveAsNewTitle: 'Create a new saved graph from the current editor content',
			hasChangesInfo: 'Save changes updates the selected saved graph; "Save as new" creates a copy.',
			newGraphInfo:
				'Your browser may ask before leaving with unsaved changes. Saved graphs live on your account.',
			unsaved: 'Unsaved changes',
			saved: 'Saved',
		},
		algorithm: {
			label: 'Algorithm',
			minty: 'Minty (shortest paths)',
			fordFulkerson: 'Ford–Fulkerson (max flow)',
			solving: 'Solving…',
			run: 'Run algorithm',
		},
		run: {
			failedTitle: 'Compute failed',
			shortestPathsTitle: 'Shortest paths from vertex {{source}}',
			toVertex: 'To {{vertex}}:',
			weight: 'weight:',
			noResultsTitle: 'No results yet',
			noResultsDescription: 'Run the selected algorithm to see the result and execution trace here.',
		},
		input: {
			title: 'Graph input',
			loadExample: 'Load example',
			verticesCount: 'Vertices count',
			sourceVertex: 'Source vertex',
			edges: 'Edges',
			addEdge: '+ Add edge',
			from: 'From',
			to: 'To',
			weight: 'Weight',
			removeEdge: 'Remove edge',
			invalid: 'Invalid graph: vertices ≥ 1, source within 1..vertices, edge endpoints within range.',
		},
		canvas: {
			source: 'source',
			ariaLabel: 'Graph with {{vertices}} vertices and {{edges}} edges',
		},
		toasts: {
			savedAsNew: 'Saved as new graph',
			updated: 'Graph updated',
			saved: 'Graph saved',
			noLongerExists: 'Saved graph no longer exists',
			noLongerExistsDetail: 'Save it again to create a new copy.',
			couldNotSave: 'Could not save graph',
		},
	},
	savedGraphs: {
		title: 'My Graphs',
		updated: 'Updated {{date}}',
		deleteQuestion: 'Delete?',
		deleting: 'Deleting…',
		yes: 'Yes',
		no: 'No',
		deleteTitle: 'Delete graph',
		deleteAriaLabel: 'Delete {{name}}',
		openTitle: 'Open "{{name}}"',
		loading: 'Loading saved graphs…',
		loadErrorTitle: 'Could not load saved graphs',
		emptyTitle: 'No saved graphs yet',
		emptyDescription: 'Save a graph from the editor below to reuse it later.',
		toasts: {
			noLongerExists: 'Graph no longer exists',
			noLongerExistsDetail: 'It may have been deleted.',
			couldNotOpen: 'Could not open graph',
			deleted: 'Graph deleted',
			couldNotDelete: 'Could not delete graph',
		},
	},
	about: {
		title: 'About & Help',
		subtitle: 'What Graph Resolver does and how to solve a graph from start to finish.',
		app: {
			title: 'About the application',
			description:
				'Graph Resolver is a workspace for working with graphs. Create or open a graph, run a graph algorithm on it, and inspect the computed solution together with an interactive visualization.',
			features: {
				create: 'Create and enter graphs by specifying vertices and edges.',
				save: 'Save graphs to your account and reuse them later.',
				algorithms:
					'Run graph algorithms — Minty for shortest paths and Ford–Fulkerson for maximum flow.',
				results: 'The application calculates the solution and displays it on the graph.',
			},
		},
		howTo: {
			title: 'How to use',
			lead: 'Solving a graph takes just a few steps.',
			steps: {
				create: {
					title: 'Create a new graph or select a saved one',
					description:
						'Start a new graph or open one from "My Graphs". A saved graph is loaded into the editor with its vertices, edges and source vertex.',
				},
				define: {
					title: 'Specify vertices and edges',
					description:
						'Set the number of vertices and add edges, providing a weight for each edge where the algorithm requires it.',
				},
				algorithm: {
					title: 'Select the required algorithm',
					description: 'Choose Minty (shortest paths) or Ford–Fulkerson (maximum flow) in the algorithm selector.',
				},
				source: {
					title: 'Provide the source vertex and other parameters',
					description:
						'Set the source vertex (and any other required parameters) within the valid range before running the algorithm.',
				},
				run: {
					title: 'Run the algorithm',
					description: 'Press "Run algorithm". The input is validated and the selected algorithm is executed.',
				},
				review: {
					title: 'Review the result and visualization',
					description:
						'Read the calculated distances and paths next to the graph and inspect the highlighted solution in the visualization.',
				},
			},
			constraints: {
				title: 'Input constraints & validation',
				lead: 'The editor validates the graph before it can be saved or solved:',
				vertices: 'The number of vertices must be at least 1.',
				source: 'The source vertex must be between 1 and the number of vertices.',
				edges: 'Every edge endpoint must be within 1..vertices.',
				weights: 'Every edge has a numeric weight that is passed to the algorithm.',
				saving:
					'A graph can only be saved once it is valid, and you are warned about unsaved changes before leaving the page.',
			},
		},
		developers: {
			title: 'Developers',
			description: 'The team that built Graph Resolver.',
		},
		supervisor: {
			title: 'Scientific supervisor',
			description: 'Academic supervisor of the project.',
		},
		agreement: {
			title: 'User Agreement',
			subtitle: 'Terms of use for the Graph Resolver educational project.',
			download: 'Download agreement',
		},
	},
	home: {
		hero: {
			badge: 'Welcome',
			title: 'Welcome to Graph Resolver',
			description: 'Create, manage, visualize and solve graph problems using the implemented algorithms.',
			message:
				'A workspace for building graphs, running the Minty shortest-path and Ford–Fulkerson max-flow algorithms, and reviewing the computed solution.',
		},
		quickActions: {
			title: 'Quick actions',
			create: {
				title: 'Create graph',
				description: 'Start a new graph from scratch in the editor.',
			},
			saved: {
				title: 'Saved graphs',
				description: 'Open and reuse graphs saved to your account.',
			},
			solve: {
				title: 'Solve graph',
				description: 'Run an algorithm on the current graph and inspect the result.',
			},
			about: {
				title: 'About',
				description: 'Application info, user guide, developers and the user agreement.',
			},
		},
		recent: {
			title: 'Recent graphs',
			viewAll: 'View all',
			open: 'Open "{{name}}"',
			updated: 'Updated {{date}}',
			loading: 'Loading saved graphs…',
			errorTitle: 'Could not load saved graphs',
			emptyTitle: 'No saved graphs yet',
			emptyDescription: 'Create your first graph and save it to reuse it later.',
			createFirst: 'Create graph',
		},
		howItWorks: {
			title: 'How it works',
			stepLabel: 'Step {{number}}',
			steps: {
				create: 'Create graph',
				configure: 'Configure algorithm',
				run: 'Run',
				view: 'View solution',
			},
		},
	},
};