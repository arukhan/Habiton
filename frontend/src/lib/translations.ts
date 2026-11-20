export type Locale = "en" | "ru";
export type TranslationValues = Record<string, string | number>;

const russian: Readonly<Record<string, string>> = {
  Today: "Сегодня",
  Insights: "Статистика",
  You: "Профиль",
  "← Today": "← Сегодня",
  "← Profile": "← Профиль",
  "Back to Today": "На главную",
  "Main navigation": "Основная навигация",
  "Habiton Penguin": "Пингвин Habiton",
  "Habiton penguin waving hello": "Пингвин Habiton машет лапкой",
  "Happy Habiton penguin": "Радостный пингвин Habiton",
  "Habiton penguin celebrating your progress":
    "Пингвин Habiton радуется вашим успехам",
  "Habiton penguin resting under a rain cloud":
    "Пингвин Habiton отдыхает под дождём",
  "Getting your quests ready...": "Готовим ваши задания…",
  "Redirecting to login...": "Переходим ко входу…",
  "Habiton · A little, every day. 🌱": "Habiton · Понемногу каждый день. 🌱",
  "Your rhythm is here.": "Возвращайтесь в свой ритм",
  "Welcome back. Your penguin missed you!":
    "С возвращением! Ваш пингвин скучал.",
  "Email address": "Электронная почта",
  Password: "Пароль",
  "Signing in...": "Входим…",
  "Log in": "Войти",
  "New to Habiton?": "Впервые в Habiton?",
  "Create account": "Создать аккаунт",
  "Login failed": "Не удалось войти",
  "Start with a little.": "Начните с малого",
  "Small steps are enough to begin.": "Для начала хватит маленького шага.",
  "Your name": "Ваше имя",
  "Password (8+ characters)": "Пароль (от 8 символов)",
  "Create your account": "Зарегистрироваться",
  "Already have an account?": "Уже есть аккаунт?",
  "Could not register": "Не удалось зарегистрироваться",
  Language: "Язык",
  "YOUR DAILY ADVENTURE": "ВАШЕ ЕЖЕДНЕВНОЕ ПРИКЛЮЧЕНИЕ",
  "Back on track, {name}.": "Вы снова в деле, {name}!",
  Adventurer: "Искатель приключений",
  "One step counts. Your penguin is cheering for you.":
    "Даже один шаг важен. Ваш пингвин за вас болеет!",
  "{count}-day streak": "Дней подряд: {count}",
  "Level {count}": "Уровень {count}",
  "Habits for this week": "Привычки на этой неделе",
  "View {date}": "Открыть {date}",
  "YOUR RECOVERY IS READY": "ПЛАН ВОССТАНОВЛЕНИЯ ГОТОВ",
  "Let's build back gently": "Возвращайтесь постепенно",
  "{habit}: start small, then return to your goal.":
    "Начните с малого и постепенно вернитесь к цели «{habit}».",
  "Continue recovery": "Продолжить восстановление",
  "{count} of 3 recoveries still available": "Осталось попыток: {count} из 3",
  "MISSED A DAY?": "ПРОПУСТИЛИ ДЕНЬ?",
  "A miss is a moment, not the end.": "Один пропуск не отменяет ваш прогресс",
  "Keep what you've built. Return with a smaller micro-quest.":
    "Сохраните свой прогресс и вернитесь с помощью небольшого задания.",
  "⚡ Report a missed day": "⚡ Сообщить о пропуске",
  "Recovery unlocks after 3 completed days. Keep going!":
    "Восстановление доступно после трёх дней подряд. Продолжайте в своём темпе!",
  "Your history and earned XP are always kept.":
    "История и заработанный опыт сохраняются.",
  "Your habits": "Ваши привычки",
  "Habits · {date}": "Привычки · {date}",
  "New habit": "Новая привычка",
  "Archive {habit}? Your history remains saved.":
    "Архивировать привычку «{habit}»? История сохранится.",
  "Your story starts with one habit.":
    "Ваша история начинается с одной привычки",
  "No habits were scheduled for this day.":
    "На этот день привычки не запланированы.",
  "Create your first habit": "Создать первую привычку",
  "Recovery journey": "История восстановления",
  "Your completed quests stay in your history.":
    "Выполненные задания остаются в истории.",
  "Open latest recovery →": "Последнее восстановление →",
  "🐧 Progress is personal. No leaderboards, no punishment.":
    "🐧 Двигайтесь в своём темпе, без рейтингов и штрафов.",
  "Could not load calendar": "Не удалось загрузить календарь",
  "Something went wrong": "Что-то пошло не так",
  "{count} min daily": "{count} мин в день",
  "{count} minutes": "{count} мин",
  "{count} min": "{count} мин",
  "Archive {habit}": "Архивировать привычку «{habit}»",
  "Archive habit": "Архивировать привычку",
  "Undo completion of {habit}": "Отменить выполнение привычки «{habit}»",
  "Complete {habit}": "Отметить привычку «{habit}» выполненной",
  "Past and future days are read-only":
    "Прошлые и будущие дни доступны только для просмотра",
  "Undo completion": "Отменить выполнение",
  "Mark as completed": "Отметить выполненной",
  "NEW ADVENTURE": "НОВОЕ ПРИКЛЮЧЕНИЕ",
  "Start with one small habit.": "Начните с одной небольшой привычки",
  "Choose a goal that fits your real life. You can grow it later.":
    "Выберите посильную цель. Позже её можно увеличить.",
  "Habit name": "Название привычки",
  "Read for 20 minutes": "Читать 20 минут",
  Category: "Категория",
  Study: "Учёба",
  Reading: "Чтение",
  Fitness: "Фитнес",
  Health: "Здоровье",
  Mindfulness: "Осознанность",
  Other: "Другое",
  "Daily goal in minutes": "Ежедневная цель в минутах",
  "Daily goal": "Ежедневная цель",
  "Custom minutes…": "Другое время…",
  "Custom minutes": "Другое время",
  "Custom goal (1–1440 minutes)": "Своя цель (1–1440 минут)",
  "Custom goal in minutes": "Своя цель в минутах",
  "💜 Consistency is not perfection. If you miss a day after building a streak, Habiton can offer a smaller recovery quest.":
    "💜 Постоянство не требует идеальности. Если вы пропустите день после серии, Habiton предложит небольшое задание для возвращения.",
  "Saving...": "Сохраняем…",
  "Create habit": "Создать привычку",
  Cancel: "Отмена",
  "Choose a daily goal between 1 and 1440 minutes.":
    "Выберите ежедневную цель от 1 до 1440 минут.",
  "Could not create habit": "Не удалось создать привычку",
  "YOUR REAL PROGRESS": "ВАШ ПРОГРЕСС",
  "Your progress.": "Ваш прогресс",
  "Every comeback matters. Every step is recorded honestly.":
    "Каждое возвращение важно. Каждый шаг остаётся в истории.",
  "PERSONAL SUMMARY": "ЛИЧНАЯ СВОДКА",
  "Perfect days (last 14)": "Все привычки выполнены (за 14 дней)",
  Recoveries: "Восстановления",
  "Step-ups": "Промежуточные задания",
  "{habits} · Best streak: {days}": "{habits} · Лучшая серия: {days}",
  "Daily completion": "Выполнение по дням",
  "The percentage of your habits completed each day. 100% means all habits for that day were completed.":
    "Доля выполненных привычек за день. 100% означает, что все привычки на этот день выполнены.",
  "Habit completion by day": "Выполнение привычек по дням",
  "{date}: {completed} of {total} habits ({percent}%)":
    "{date}: выполнено {completed} из {total} ({percent}%)",
  "{date}: no habits yet": "{date}: привычек ещё нет",
  "Full = 100% of the day's habits. Partial = 1–99%. No bar = 0%.":
    "Полностью — 100%, частично — 1–99%, без столбца — 0%.",
  "Activity timeline": "История действий",
  Completed: "Выполнено",
  full: "Полное выполнение",
  missed: "Пропуск",
  recovery: "Восстановление",
  "step up": "Промежуточное задание",
  "Complete your first quest to start your story.":
    "Выполните первое задание, чтобы начать свою историю.",
  "YOUR PENGUIN COMPANION": "ВАШ ПИНГВИН-СПУТНИК",
  "A little more you.": "Ваш профиль",
  "{class} Penguin": "Пингвин — {class}",
  "{class} · Penguin": "{class} · Пингвин",
  "Edit profile": "Редактировать профиль",
  "Display name": "Отображаемое имя",
  "Save name": "Сохранить имя",
  "Email and password settings will be added in a separate secure update.":
    "Настройки почты и пароля появятся в отдельном обновлении.",
  "CHOOSE YOUR PATH": "ВЫБЕРИТЕ СВОЙ ПУТЬ",
  Warrior: "Воин",
  Mage: "Маг",
  Priest: "Жрец",
  "A brave penguin who never gives up.": "Смелый пингвин, который не сдаётся.",
  "A curious penguin who grows through learning.":
    "Любознательный пингвин, который растёт благодаря учёбе.",
  "A caring penguin who values balance and healing.":
    "Заботливый пингвин, который ценит баланс и отдых.",
  "Habits icon": "Значок привычек",
  Habits: "Привычки",
  "Best streak icon": "Значок лучшей серии",
  "Best streak": "Лучшая серия",
  "Recovery icon": "Значок восстановления",
  "RECOVERY AVAILABILITY": "ДОСТУПНОСТЬ ВОССТАНОВЛЕНИЯ",
  "Recoveries left by habit": "Оставшиеся попытки по привычкам",
  "Each habit allows up to 3 recovery attempts in a rolling 30-day window. Other eligibility rules still apply.":
    "Для каждой привычки доступно до трёх попыток за последние 30 дней. Действуют и другие условия восстановления.",
  "Create your first habit to see its recovery limits.":
    "Создайте первую привычку, чтобы увидеть лимит восстановления.",
  "{count}/3 left": "Осталось {count} из 3",
  "MY HABITS": "МОИ ПРИВЫЧКИ",
  "Manage your habits": "Управление привычками",
  "No habits yet.": "Привычек пока нет.",
  Edit: "Изменить",
  "Edit habit": "Редактировать привычку",
  Close: "Закрыть",
  "New goal applies to future check-ins. You cannot edit a habit while an active recovery plan is running.":
    "Новая цель применяется к будущим отметкам. Пока идёт восстановление, привычку нельзя изменить.",
  "Save changes": "Сохранить изменения",
  "YOUR GROWTH": "ВАШ РОСТ",
  "How you earn XP": "Как получить XP",
  "✅ Complete a habit": "✅ Выполнить привычку",
  "✨ Complete a micro-quest": "✨ Выполнить микроквест",
  "🌱 Complete a step-up": "🌱 Выполнить промежуточное задание",
  "No leaderboards. Your only competition is yesterday.":
    "Без рейтингов. Ориентируйтесь на собственный прогресс.",
  "Appearance settings": "Настройки оформления",
  "YOUR SPACE": "ВАШЕ ПРОСТРАНСТВО",
  Appearance: "Оформление",
  "Customize theme": "Настроить тему",
  "Choose your color": "Выберите цвет",
  "Color palettes": "Цветовые палитры",
  Lavender: "Лавандовый",
  Sage: "Шалфейный",
  Blue: "Синий",
  Rose: "Розовый",
  Peach: "Персиковый",
  "Dark mode": "Тёмная тема",
  On: "Вкл.",
  Off: "Выкл.",
  "Saved automatically on this device. The same colors apply to Today, Recovery, Insights and Profile.":
    "Цвета автоматически сохраняются на этом устройстве и применяются ко всем основным экранам.",
  "Log out": "Выйти",
  "Your pace. Your space. Every day.":
    "Ваш ритм и ваше пространство. Каждый день.",
  "Name updated": "Имя обновлено",
  "Habit updated. Previous sessions are unchanged.":
    "Привычка обновлена. Предыдущие выполнения сохранены.",
  "RECOVERY · STEP 1": "ВОССТАНОВЛЕНИЕ · ШАГ 1",
  "A miss is a moment.": "Один день можно пропустить",
  "Tell us what got in the way. Your earlier effort still matters.":
    "Расскажите, что помешало. Ваши прошлые усилия по-прежнему важны.",
  "Which habit did you miss?": "Какую привычку вы пропустили?",
  "Missed date": "Дата пропуска",
  "Loading missed dates...": "Загружаем даты…",
  "No available missed dates": "Нет доступных дат пропуска",
  "Only past dates without a recorded completion are selectable. Please confirm that you really missed the habit.":
    "Можно выбрать только прошедшую дату без отметки о выполнении. Убедитесь, что действительно пропустили привычку.",
  "What got in the way?": "Что помешало?",
  "📚 Exams / deadlines": "📚 Экзамены или дедлайны",
  "😴 Tired / low energy": "😴 Усталость или нехватка сил",
  "🌦️ Something else": "🌦️ Другая причина",
  "Today's capacity": "Сколько у вас сил сегодня?",
  Workload: "Нагрузка",
  High: "Высокая",
  Medium: "Средняя",
  Low: "Низкая",
  "Energy: {count} / 5": "Энергия: {count} из 5",
  "⏰ Your 48-hour window begins when you submit this report. A micro-quest appears immediately.":
    "⏰ После отправки отчёта сразу появится микроквест и начнётся отсчёт 48 часов.",
  "Preparing your quest...": "Готовим задание…",
  "Get my recovery quest": "Получить задание",
  "Could not load missed days": "Не удалось загрузить дни пропуска",
  "Please select an available missed date": "Выберите доступную дату пропуска",
  "Could not report a missed day": "Не удалось сообщить о пропуске",
  "Could not save recovery": "Не удалось сохранить восстановление",
  "Loading recovery session...": "Загружаем план восстановления…",
  "Micro-quest": "Микроквест",
  "Step-up": "Промежуточное задание",
  "Original goal": "Исходная цель",
  "Complete your full {minutes}-minute {habit} session.":
    "Выполните привычку «{habit}» в полном объёме: {minutes} мин.",
  "RECOVERY · YOUR COMEBACK": "ВОССТАНОВЛЕНИЕ · ВАШЕ ВОЗВРАЩЕНИЕ",
  "Your rhythm is back!": "Вы вернулись в свой ритм!",
  "Start small. Build back.": "Начните с малого и постепенно вернитесь",
  "One step at a time.": "Шаг за шагом",
  "Your progress is still here.": "Ваш прогресс сохранён.",
  "YOUR MICRO-QUEST": "ВАШ МИКРОКВЕСТ",
  "⏳ {count} hours left in the recovery window":
    "⏳ Осталось времени на микроквест: {count} ч",
  "How you return to your goal": "Шаги к исходной цели",
  "🛡️ {count} of 3 recovery windows left (rolling 30 days, max 2 in a row)":
    "🛡️ Осталось {count} из 3 попыток за последние 30 дней, максимум две подряд.",
  "You can start now. No need to wait for a manual review.":
    "Можно начать прямо сейчас. Проверка вручную не требуется.",
  "Accept {count}-minute quest": "Принять задание на {count} мин",
  "Recovery window expired. Your history and XP remain saved.":
    "Время на восстановление истекло. История и XP сохранены.",
  "View your comeback 🎉": "Посмотреть результат 🎉",
  "Do the task. Then tell us.": "Выполните задание и отметьте результат",
  "Note {count} (optional)": "Заметка {count} (необязательно)",
  "A small thing I learned or did...": "Что я узнал или сделал…",
  "I really completed this step.": "Подтверждаю, что выполнил задание.",
  "Record micro-quest completion": "Подтвердить выполнение микроквеста",
  "Record step-up completion": "Подтвердить промежуточное задание",
  "Record original goal completion": "Подтвердить выполнение исходной цели",
  "Recovery not found": "План восстановления не найден",
  "RECOVERY RECORDED": "ВОССТАНОВЛЕНИЕ ЗАПИСАНО",
  "Back to your rhythm!": "Вы снова в своём ритме!",
  "Streak kept!": "Серия сохранена!",
  "You made space for one meaningful step. Keep building gently.":
    "Вы нашли время на важный шаг. Продолжайте в своём темпе.",
  "{days} saved": "Сохранена серия: {days}",
  "MICRO-QUEST COMPLETE": "МИКРОКВЕСТ ВЫПОЛНЕН",
  "STEP-UP COMPLETE": "ПРОМЕЖУТОЧНОЕ ЗАДАНИЕ ВЫПОЛНЕНО",
  "ORIGINAL GOAL COMPLETE": "ИСХОДНАЯ ЦЕЛЬ ВЫПОЛНЕНА",
  "Recovery, step-up and full sessions are recorded separately. We never turn a missed day into a full session.":
    "Микроквест, промежуточное и полное выполнения записываются отдельно. Пропущенный день не считается выполненным.",
  "Your recovery progress": "Ваш прогресс восстановления",
  "🐧 PENGUIN'S HERO LOG": "🐧 ДНЕВНИК ПИНГВИНА",
  "Every small step counts. I'm proud you came back!":
    "Каждый маленький шаг важен. Здорово, что вы вернулись!",
  "View progress": "Посмотреть прогресс",
  "Continue the step-up plan": "Перейти к следующему шагу",
  "Recovery progress": "Ход восстановления",
  "✓ Complete": "✓ Выполнено",
  "Hi, adventurer!": "Привет, искатель приключений!",
  "Small steps, real growth.": "Маленькие шаги, настоящий прогресс.",
  "It happens.": "Так бывает",
  "One missed day doesn't erase your effort.":
    "Один пропущенный день не отменяет ваши усилия.",
  "One small step": "Один маленький шаг",
  "Your comeback starts here.": "Ваше возвращение начинается здесь.",
  "You did it!": "У вас получилось!",
  "Your progress is still yours.": "Ваш прогресс остаётся с вами.",
  "Your penguin hero": "Ваш пингвин-герой",
  "Level up at your own pace.": "Набирайте уровни в своём темпе.",
  "INTERNAL METRICS · REAL USERS ONLY":
    "ВНУТРЕННИЕ МЕТРИКИ · РЕАЛЬНЫЕ ПОЛЬЗОВАТЕЛИ",
  "Product health.": "Метрики продукта",
  "Demo accounts excluded. Data refreshes every 20 seconds.":
    "Демо-аккаунты исключены. Данные обновляются каждые 20 секунд.",
  Unavailable: "Недоступно",
  "Set ADMIN_EMAIL in your .env for this account.":
    "Укажите ADMIN_EMAIL для этого аккаунта в файле .env.",
  "Real users": "Реальные пользователи",
  "Created habits": "Созданные привычки",
  "Missed reports": "Отчёты о пропусках",
  "Eligible, 48h elapsed": "Доступно восстановление, 48 ч истекли",
  "Recovered within 48h": "Восстановлено за 48 ч",
  "48h Recovery Rate": "Доля восстановлений за 48 ч",
  "Events (last 30 days)": "События за последние 30 дней",
  "KR1 denominator includes eligible reports only after their 48h measurement window has closed.":
    "В знаменатель KR1 входят подходящие отчёты, для которых уже истекли 48 часов.",
  "Read for {count} minutes and write one sentence about it.":
    "Почитайте {count} мин и запишите одно предложение о прочитанном.",
  "Read for {count} minutes and note one idea.":
    "Почитайте {count} мин и запишите одну идею.",
  "Move gently for {count} minutes at a comfortable pace.":
    "Подвигайтесь {count} мин в комфортном темпе.",
  "Do {count} minutes of comfortable movement.":
    "Подвигайтесь в удобном темпе {count} мин.",
  "Take {count} minutes to breathe, reflect, or rest.":
    "Выделите {count} мин на дыхание, размышление или отдых.",
  "Spend {count} minutes on a calming routine.":
    "Посвятите {count} мин спокойной практике.",
  "Review your notes for {count} minutes and write one key idea.":
    "Просмотрите записи в течение {count} мин и выпишите главную мысль.",
  "Study for {count} minutes and explain one concept.":
    "Позанимайтесь {count} мин и объясните одну идею своими словами.",
  "I returned, one small step at a time. Tomorrow I can try a little more.":
    "Я возвращаюсь маленькими шагами. Завтра смогу попробовать чуть больше.",
  "A little more focus today. My original goal is in reach.":
    "Сегодня я смог сосредоточиться чуть дольше. Исходная цель уже близко.",
  "I came back at my own pace. The small steps counted.":
    "Я вернулся в своём темпе. Маленькие шаги помогли.",
  "Please log in": "Войдите в аккаунт",
  "Session expired; log in again": "Сессия истекла. Войдите снова.",
  "Could not create session": "Не удалось начать сессию",
  "Invalid details": "Проверьте введённые данные",
  "Name, email and password (8–72 characters) required":
    "Укажите имя, почту и пароль от 8 до 72 символов",
  "Password error": "Ошибка при сохранении пароля",
  "Email already exists": "Аккаунт с такой почтой уже существует",
  "Invalid login": "Проверьте данные для входа",
  "Invalid email or password": "Неверная почта или пароль",
  "Invalid name": "Проверьте имя",
  "Invalid class": "Выберите допустимый класс героя",
  "Save failed": "Не удалось сохранить данные",
  "Database error": "Ошибка базы данных",
  "Invalid habit": "Проверьте данные привычки",
  "Please provide a title and goal in minutes (1–1440)":
    "Укажите название и цель от 1 до 1440 минут",
  "Invalid category": "Проверьте категорию привычки",
  "Cannot save habit": "Не удалось сохранить привычку",
  "Habit not found": "Привычка не найдена",
  "Database unavailable": "База данных недоступна",
  "DB unavailable": "База данных недоступна",
  "Already completed today": "Сегодня привычка уже выполнена",
  "Could not check recovery status":
    "Не удалось проверить статус восстановления",
  "Finish your active recovery plan first":
    "Сначала завершите текущий план восстановления",
  "Could not check the previous day": "Не удалось проверить предыдущий день",
  "Could not record completion": "Не удалось записать выполнение",
  "Could not update streak": "Не удалось обновить серию",
  "Could not update XP": "Не удалось обновить XP",
  "Could not save": "Не удалось сохранить данные",
  "Could not verify completion": "Не удалось проверить выполнение",
  "Recovery completion cannot be undone here":
    "Выполнение задания восстановления здесь отменить нельзя",
  "Could not undo completion": "Не удалось отменить выполнение",
  "No completion to undo today":
    "Сегодня ещё нет выполнения, которое можно отменить",
  "Could not save changes": "Не удалось сохранить изменения",
  "Invalid report": "Проверьте данные о пропуске",
  "Select a missed date": "Выберите дату пропуска",
  "Choose a past missed date within the last 30 days":
    "Выберите прошедшую дату в пределах последних 30 дней",
  "Choose a reason": "Укажите причину",
  "You already have a recovery plan in progress":
    "У вас уже есть активный план восстановления",
  "The habit did not exist on that date": "На эту дату привычки ещё не было",
  "This day was already reported": "Вы уже сообщили о пропуске за этот день",
  "This day has already been reported":
    "Вы уже сообщили о пропуске за этот день",
  "You completed this habit on the selected day":
    "В выбранный день привычка была выполнена",
  "Could not check recovery limits":
    "Не удалось проверить лимиты восстановления",
  "Could not save streak": "Не удалось сохранить серию",
  "Could not save missed day": "Не удалось сохранить пропуск",
  "Could not load recovery state": "Не удалось загрузить статус восстановления",
  "Could not expire recovery":
    "Не удалось закрыть истёкшее окно восстановления",
  "Could not save expired recovery":
    "Не удалось сохранить статус истёкшего восстановления",
  "Recovery window expired; history and XP were kept":
    "Время на восстановление истекло. История и XP сохранены.",
  "Complete the previous step first": "Сначала завершите предыдущий шаг",
  "Confirm that you completed the task": "Подтвердите выполнение задания",
  "Up to three notes allowed": "Можно добавить до трёх заметок",
  "Could not save the check-in": "Не удалось сохранить отметку",
  "Could not save step": "Не удалось сохранить шаг",
  "Could not save progress": "Не удалось сохранить прогресс",
  "Commit failed": "Не удалось сохранить данные",
  "Recovery unlocks after a streak of at least 3 days":
    "Восстановление доступно после серии из трёх дней",
  "Recovery limit reached. Streak reset; all history and XP are preserved.":
    "Лимит восстановления исчерпан. Серия сброшена, история и XP сохранены.",
  "Could not load weekly habits": "Не удалось загрузить привычки на неделю",
  "Could not read weekly habits": "Не удалось прочитать привычки на неделю",
  "Could not load missed dates": "Не удалось загрузить даты пропусков",
  "Could not read missed dates": "Не удалось прочитать даты пропусков",
  "Could not load recovery limits":
    "Не удалось загрузить лимиты восстановления",
  "Could not read recovery limits":
    "Не удалось прочитать лимиты восстановления",
  "Invalid habit details": "Проверьте данные привычки",
  "Enter a habit name, category and goal between 1 and 1440 minutes":
    "Укажите название, категорию и цель от 1 до 1440 минут",
  "Could not check active recovery":
    "Не удалось проверить активное восстановление",
  "Finish your active Recovery Flow before editing this habit":
    "Завершите восстановление, прежде чем редактировать привычку",
  "Could not update habit": "Не удалось обновить привычку",
  "Could not save habit": "Не удалось сохранить привычку",
  "Could not load daily progress": "Не удалось загрузить прогресс по дням",
  "Could not read daily progress": "Не удалось прочитать прогресс по дням",
  "Admin access only": "Доступно только администратору",
  "Hero’s Log": "Дневник героя",
  "Open Hero’s Log": "Открыть дневник героя",
  "← Insights": "← Статистика",
  "Your penguin remembers the steps you completed.":
    "Ваш пингвин помнит каждый выполненный шаг.",
  "Your Hero’s Log is empty.": "Дневник героя пока пуст.",
  "Complete a habit or a recovery step to add your first entry.":
    "Выполните привычку или шаг восстановления, чтобы появилась первая запись.",
  "Habit completed": "Привычка выполнена",
  "I showed up for another round of training. That effort counts.":
    "Я снова вышел на тренировку. Каждый такой выход важен.",
  "I’ve added another completed quest to my spellbook.":
    "В моём гримуаре появилась запись о новом выполненном задании.",
  "I made room for one thing that matters today.":
    "Сегодня нашлось время на то, что для меня важно.",
  "I’m back on the trail. One small step was enough to start.":
    "Я снова в пути. Для начала хватило одного маленького шага.",
  "A tiny spell was enough to get the adventure moving again.":
    "Одного маленького заклинания хватило, чтобы приключение продолжилось.",
  "I gave myself a gentler way to return, and it worked.":
    "Я выбрал мягкий способ вернуться, и у меня получилось.",
  "I took on a little more today. My next step feels within reach.":
    "Сегодня я взялся за задачу чуть сложнее. Следующий шаг уже по силам.",
  "I practiced a stronger spell. My full quest feels closer.":
    "Я попробовал заклинание посложнее. До полного задания уже недалеко.",
  "I found a pace I could keep as I moved closer to my goal.":
    "Я нашёл посильный темп и стал ближе к своей цели.",
  "Starter habits": "Стартовые привычки",
  "Pick a starting point. You can edit the details before saving.":
    "Выберите вариант. Перед сохранением можно изменить название и цель.",
  Read: "Почитать",
  "Take a walk": "Прогуляться",
  "Review notes": "Повторить конспект",
  "Hero achievements": "Достижения героя",
  "First step": "Первый шаг",
  "Complete any habit.": "Выполните любую привычку.",
  "Three days in a row": "Три дня в строю",
  "Complete one habit on three consecutive days.":
    "Выполняйте одну привычку три дня подряд.",
  "Hero’s comeback": "Возвращение героя",
  "Complete a recovery micro-quest after a missed day.":
    "Завершите микроквест после пропуска.",
  Unlocked: "Открыто",
  Locked: "Закрыто",
  "Personal reward": "Личная награда",
  "Choose something you can treat yourself to after {count} new habit completions.":
    "Выберите, чем порадуете себя после {count} новых выполнений.",
  "{current} of {goal} completions": "Выполнения: {current} из {goal}",
  "Reward unlocked! Time to enjoy it.":
    "Награда открыта! Пора себя порадовать.",
  "Reward name": "Название награды",
  "Set reward": "Сохранить награду",
  "Could not load your reward": "Не удалось загрузить награду",
  "Could not save your reward": "Не удалось сохранить награду",
  "Enter a reward name from 1 to 80 characters":
    "Введите название награды от 1 до 80 символов",
  "Finish the current reward goal first": "Сначала получите текущую награду",
  "Could not load achievements": "Не удалось загрузить достижения",
  "Recovery funnel": "Воронка восстановления",
  "Unique users in recovery plans offered in the last 30 days. Demo accounts are excluded.":
    "Уникальные пользователи, которым предложили восстановление за последние 30 дней. Демо-аккаунты исключены.",
  "Micro-quest offered": "Микроквест предложен",
  "Micro-quest accepted": "Микроквест принят",
  "Micro-quest completed": "Микроквест выполнен",
  "Original goal restored": "Исходная цель восстановлена",
  "Could not load recovery funnel":
    "Не удалось загрузить воронку восстановления",
  "Admin dashboard": "Админ-панель",
  "Only the configured administrator can view product metrics.":
    "Продуктовые метрики доступны только администратору.",
  "Product analytics": "Аналитика продукта",
  "Demo accounts are excluded. Dates use the Asia/Almaty time zone.":
    "Демо-аккаунты исключены. Даты указаны по времени Алматы.",
  "Reporting period": "Период отчёта",
  "Last 7 days": "Последние 7 дней",
  "Last 30 days": "Последние 30 дней",
  "Refresh metrics": "Обновить метрики",
  "Loading metrics…": "Загружаем метрики…",
  "Updated {date}": "Обновлено: {date}",
  "Choose a 7-day or 30-day range": "Выберите период в 7 или 30 дней",
  "Could not load admin metrics": "Не удалось загрузить метрики админ-панели",
  Overview: "Обзор",
  "Active in this period": "Активны за период",
  "Active today": "Активны сегодня",
  "New registrations": "Новые регистрации",
  "D7 retention": "Удержание на 7-й день (D7)",
  "{returned} of {eligible} accounts returned on day 7.":
    "На 7-й день вернулись {returned} из {eligible} аккаунтов.",
  "No completed day-7 measurement windows in this period.":
    "В этом периоде пока нет завершённых окон измерения D7.",
  "All-time totals": "За всё время",
  "Recovery within 48 hours": "Восстановление за 48 часов",
  "{recovered} of {eligible} eligible reports with closed windows.":
    "{recovered} из {eligible} подходящих отчётов с закрытым окном.",
  "No eligible reports with closed 48-hour windows in this period.":
    "За этот период пока нет подходящих отчётов с закрытым 48-часовым окном.",
  "Open 48-hour windows": "Открытые окна на 48 часов",
  "Unique users with a plan offered in this period. Percentages are relative to all users offered a plan.":
    "Уникальные пользователи, которым предложили план за период. Проценты рассчитаны от всех получивших предложение.",
  "No recovery plans were offered in this period.":
    "За этот период планы восстановления не предлагались.",
  "Daily activity": "Активность по дням",
  Date: "Дата",
  "Active users": "Активные пользователи",
  "Completion actions": "Отметки о выполнении",
  "Recorded events": "Записанные события",
  "No events recorded in this period.": "За этот период события не записаны.",
  "How these metrics are counted": "Как считаются метрики",
  "Activity means a recorded sign-in, registration, or habit or recovery action. Simply opening a page does not count.":
    "Активность — зафиксированный вход, регистрация или действие с привычкой либо восстановлением. Открытие страницы само по себе не считается.",
  "D7 includes accounts whose seventh calendar day fell in the selected period and has ended. A recorded action on that day counts as a return.":
    "В D7 входят аккаунты, чей седьмой календарный день попал в выбранный период и уже завершился. Зафиксированное действие в этот день считается возвращением.",
  "The 48-hour rate counts reports, so one person can contribute more than once. A micro-quest completed before the deadline counts as a recovery.":
    "Показатель за 48 часов считается по отчётам, поэтому один человек может учитываться несколько раз. Восстановлением считается микроквест, завершённый до дедлайна.",
  "Untrusted request origin": "Запрос отклонён сервером",
  "Request failed ({status})": "Не удалось выполнить запрос (код {status})",
};

export function translate(
  locale: Locale,
  message: string,
  values: TranslationValues = {},
) {
  const text =
    locale === "ru" && Object.hasOwn(russian, message)
      ? russian[message]
      : message;
  return text.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : placeholder,
  );
}

export function translateError(locale: Locale, message: string) {
  if (locale === "en") return message;
  const clean = message.replace(/^(?:Api)?Error: /, "");
  const status = /^Request failed \((\d+)\)$/.exec(clean)?.[1];
  if (status) return translate(locale, "Request failed ({status})", { status });
  return Object.hasOwn(russian, clean)
    ? russian[clean]
    : russian["Something went wrong"];
}

export function translateQuest(
  locale: Locale,
  message: string,
  minutes: number,
) {
  if (locale === "en") return message;
  const template = message.replace(/\b\d+\b/, "{count}");
  return Object.hasOwn(russian, template)
    ? translate(locale, template, { count: minutes })
    : message;
}

function countWithUnit(
  locale: Locale,
  count: number,
  english: [string, string],
  forms: [string, string, string],
) {
  if (locale === "en") return `${count} ${english[count === 1 ? 0 : 1]}`;
  const category = new Intl.PluralRules("ru").select(count);
  return `${count} ${forms[category === "one" ? 0 : category === "few" ? 1 : 2]}`;
}

export function dayCount(locale: Locale, count: number) {
  return countWithUnit(locale, count, ["day", "days"], ["день", "дня", "дней"]);
}

export function habitCount(locale: Locale, count: number) {
  return countWithUnit(
    locale,
    count,
    ["habit", "habits"],
    ["привычка", "привычки", "привычек"],
  );
}
