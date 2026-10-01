import type { en } from './en';

/**
 * Ukrainian translation resources.
 *
 * The `satisfies typeof en` constraint keeps this file structurally identical
 * to the English resources: adding/removing a key in either file is a
 * TypeScript error, so every user-facing string always exists in both locales
 * and falls back to English if one is ever missing.
 */
export const uk = {
	common: {
		appName: 'Graph Resolver',
		loading: 'Завантаження…',
		retry: 'Повторити',
		dismiss: 'Закрити',
		signOut: 'Вийти',
		checkingAccount: 'Перевірка вашого облікового запису…',
		checkingSubscription: 'Перевірка вашої підписки…',
		verifyingSubscription: 'Перевірка підписки…',
		restoringSession: 'Відновлення сесії…',
	},
	errors: {
		somethingWentWrong: 'Щось пішло не так.',
		sessionExpired: 'Ваша сесія закінчилася. Увійдіть знову.',
		failedToLoadSubscription: 'Не вдалося завантажити підписку.',
		failedToLoadSavedGraphs: 'Не вдалося завантажити збережені графи.',
	},
	auth: {
		welcomeBack: 'З поверненням',
		createAccount: 'Створіть обліковий запис',
		signInToContinue: 'Увійдіть, щоб продовжити роботу.',
		registerToStart: 'Зареєструйтеся, щоб почати розв’язувати графи.',
		continueWithGoogle: 'Продовжити з Google',
		noAccount: 'Немає облікового запису?',
		register: 'Зареєструватися',
		haveAccount: 'Вже маєте обліковий запис?',
		signIn: 'Увійти',
	},
	languageSwitcher: {
		label: 'Мова',
		en: 'English',
		uk: 'Українська',
	},
	subscription: {
		title: 'Підпишіться на Graph Resolver',
		description:
			'Преміум-підписка відкриває повноцінну робочу область для розв’язування графів. Ваша підписка прив’язана до облікового запису й керується через платіжний шлюз на сервері.',
		whatYouGet: 'Що ви отримуєте',
		features: {
			editor: 'Редактор вводу графа з перевіркою',
			visualization: 'Візуалізація графа й покрокові результати',
			algorithms: 'Алгоритми Мінті (найкоротші шляхи) та Форда–Фалкерсона (максимальний потік)',
			traces: 'Траси виконання для аналізу алгоритмів',
		},
		currentPlan: 'Поточний план:',
		statusLabel: 'статус:',
		premium: 'Premium',
		perDays: '/ {{count}} днів',
		paymentNote:
			'Разовий платіж обробляється платіжним провайдером на сервері (Stripe). Сервер визначає остаточну суму та валюту.',
		startingPayment: 'Запуск оплати…',
		sendingPayment: 'Надсилання платежу до платіжного шлюзу.',
		paymentProcessing: 'Обробка платежу',
		paymentProcessingNote: 'Провайдер підтверджує ваш платіж. Це може зайняти кілька хвилин.',
		checkStatus: 'Перевірити статус',
		paymentConfirmed: 'Платіж підтверджено',
		verifyingSubscription: 'Перевірка підписки та розблокування застосунку…',
		paymentFailed: 'Платіж не вдався',
		tryAgain: 'Спробувати ще раз',
		paymentCancelled: 'Платіж скасовано.',
		goToApp: 'Перейти до застосунку',
		paymentDeclined: 'Платіж було відхилено.',
		couldNotCreatePayment: 'Не вдалося створити платіж.',
		paymentProcessingFailed: 'Не вдалося обробити платіж.',
		couldNotCheckStatus: 'Не вдалося перевірити статус платежу.',
		googlePay: {
			loading: 'Завантаження Google Pay…',
			unavailable: 'Google Pay недоступний для цього пристрою/браузера.',
			unavailableNote:
				'Платіж обробляється платіжним шлюзом на сервері. Спробуйте пізніше або скористайтеся пристроєм із підтримкою Google Pay.',
			initFailed: 'Не вдалося ініціалізувати Google Pay. Перевірте з’єднання та перезавантажте сторінку.',
		},
	},
	graphPage: {
		subtitle: 'Розв’язуйте задачі на графах покроково в інтерактивній робочій області.',
		saveCard: {
			title: 'Граф',
			newTitle: 'Створити новий граф',
			new: 'Новий',
			name: 'Назва',
			namePlaceholder: 'напр., тестовий граф Дейкстри',
			saving: 'Збереження…',
			save: 'Зберегти',
			saveChanges: 'Зберегти зміни',
			saveAsNew: 'Зберегти як новий',
			saveAsNewTitle: 'Створити новий збережений граф із поточного вмісту редактора',
			hasChangesInfo:
				'«Зберегти зміни» оновлює вибраний збережений граф; «Зберегти як новий» створює копію.',
			newGraphInfo:
				'Браузер може запитати перед виходом зі сторінки з незбереженими змінами. Збережені графи зберігаються у вашому обліковому записі.',
			unsaved: 'Незбережені зміни',
			saved: 'Збережено',
		},
		algorithm: {
			label: 'Алгоритм',
			minty: 'Мінті (найкоротші шляхи)',
			fordFulkerson: 'Форд–Фалкерсон (максимальний потік)',
			solving: 'Розв’язування…',
			run: 'Запустити алгоритм',
		},
		run: {
			failedTitle: 'Обчислення не вдалося',
			shortestPathsTitle: 'Найкоротші шляхи від вершини {{source}}',
			toVertex: 'До вершини {{vertex}}:',
			weight: 'вага:',
			noResultsTitle: 'Результатів ще немає',
			noResultsDescription: 'Запустіть вибраний алгоритм, щоб побачити результат і трасу виконання.',
		},
		input: {
			title: 'Ввід графа',
			loadExample: 'Завантажити приклад',
			verticesCount: 'Кількість вершин',
			sourceVertex: 'Стартова вершина',
			edges: 'Ребра',
			addEdge: '+ Додати ребро',
			from: 'З',
			to: 'У',
			weight: 'Вага',
			removeEdge: 'Видалити ребро',
			invalid:
				'Недійсний граф: вершини ≥ 1, стартова вершина в межах 1..вершин, кінці ребер у межах діапазону.',
		},
		canvas: {
			source: 'старт',
			ariaLabel: 'Граф із {{vertices}} вершин і {{edges}} ребер',
		},
		toasts: {
			savedAsNew: 'Збережено як новий граф',
			updated: 'Граф оновлено',
			saved: 'Граф збережено',
			noLongerExists: 'Збереженого графа більше не існує',
			noLongerExistsDetail: 'Збережіть його ще раз, щоб створити нову копію.',
			couldNotSave: 'Не вдалося зберегти граф',
		},
	},
	savedGraphs: {
		title: 'Мої графи',
		updated: 'Оновлено {{date}}',
		deleteQuestion: 'Видалити?',
		deleting: 'Видалення…',
		yes: 'Так',
		no: 'Ні',
		deleteTitle: 'Видалити граф',
		deleteAriaLabel: 'Видалити {{name}}',
		openTitle: 'Відкрити «{{name}}»',
		loading: 'Завантаження збережених графів…',
		loadErrorTitle: 'Не вдалося завантажити збережені графи',
		emptyTitle: 'Збережених графів ще немає',
		emptyDescription: 'Збережіть граф у редакторі нижче, щоб використати його пізніше.',
		toasts: {
			noLongerExists: 'Графа більше не існує',
			noLongerExistsDetail: 'Можливо, його видалено.',
			couldNotOpen: 'Не вдалося відкрити граф',
			deleted: 'Граф видалено',
			couldNotDelete: 'Не вдалося видалити граф',
		},
	},
} satisfies typeof en;