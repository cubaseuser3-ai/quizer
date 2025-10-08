#!/usr/bin/env python3
"""
Buzzer Question Test Script
Testet Host und User Seiten und sammelt Console Logs
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time
import json

def setup_driver(headless=False):
    """Erstelle einen Chrome WebDriver mit Console Logging"""
    options = Options()
    if headless:
        options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')

    # Enable browser logging
    options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

    driver = webdriver.Chrome(options=options)
    return driver

def get_console_logs(driver):
    """Hole alle Console Logs vom Browser"""
    logs = driver.get_log('browser')
    return logs

def test_buzzer_question(base_url, test_name):
    """Teste Buzzer-Frage mit Host und User"""
    print(f"\n{'='*60}")
    print(f"TEST: {test_name}")
    print(f"URL: {base_url}")
    print(f"{'='*60}\n")

    # Setup drivers
    host_driver = setup_driver(headless=False)
    user_driver = setup_driver(headless=False)

    try:
        # SCHRITT 1: Erstelle Quiz mit Buzzer-Frage direkt im localStorage
        print("📝 Erstelle Test-Quiz mit Buzzer-Frage...")
        host_driver.get(base_url)
        time.sleep(2)

        # Injiziere Quiz direkt in localStorage
        quiz_js = """
        const testQuiz = {
            id: 'test-buzzer-' + Date.now(),
            title: 'Python Buzzer Test',
            questions: [{
                type: 'buzzer',
                question: 'Was ist die Hauptstadt von Deutschland?',
                points: 100,
                timeLimit: 30
            }],
            createdAt: new Date().toISOString()
        };

        const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
        quizzes.push(testQuiz);
        localStorage.setItem('quizzes', JSON.stringify(quizzes));

        return testQuiz.id;
        """

        quiz_id = host_driver.execute_script(quiz_js)
        print(f"✅ Quiz erstellt mit ID: {quiz_id}")

        # SCHRITT 2: Navigiere zur Host-Seite
        print("🎮 Navigiere zur Host-Seite...")
        host_url = f"{base_url}/host/{quiz_id}"
        host_driver.get(host_url)
        time.sleep(3)

        # Prüfe Console Logs nach dem Laden
        host_logs_initial = get_console_logs(host_driver)
        print(f"📊 Host Logs (initial): {len(host_logs_initial)} Einträge")

        # SCHRITT 3: Hole Join-Code
        join_code_element = host_driver.find_element(By.CSS_SELECTOR, ".lobby-code, [class*='code']")
        join_code = join_code_element.text.replace(" ", "")
        print(f"🔢 Join Code: {join_code}")

        # SCHRITT 4: User tritt bei
        print("👤 User tritt bei...")
        user_driver.get(f"{base_url}/join?code={join_code}")
        time.sleep(2)

        # Fülle Name und Avatar aus
        name_input = user_driver.find_element(By.CSS_SELECTOR, "input[placeholder*='Name'], input[type='text']")
        name_input.send_keys("Test User")

        # Wähle Avatar
        avatars = user_driver.find_elements(By.CSS_SELECTOR, ".avatar-option, [class*='avatar']")
        if avatars:
            avatars[0].click()

        # Klicke Beitreten
        join_button = user_driver.find_element(By.XPATH, "//button[contains(text(), 'Beitreten') or contains(text(), 'Join')]")
        join_button.click()
        time.sleep(2)

        print("✅ User beigetreten")

        # SCHRITT 5: Host startet das Spiel
        print("🚀 Host startet das Spiel...")
        start_button = host_driver.find_element(By.XPATH, "//button[contains(text(), 'Spiel starten') or contains(text(), 'Start')]")
        start_button.click()
        time.sleep(3)

        print("⏰ Warte 3 Sekunden auf Buzzer-Frage Rendering...")

        # SCHRITT 6: Sammle Console Logs von beiden
        print("\n" + "="*60)
        print("📋 CONSOLE LOGS ANALYSE")
        print("="*60)

        # HOST LOGS
        host_logs = get_console_logs(host_driver)
        print(f"\n🎮 HOST LOGS ({len(host_logs)} Einträge):")
        print("-" * 60)

        host_errors = []
        for log in host_logs:
            if log['level'] == 'SEVERE' or 'error' in log['message'].lower():
                host_errors.append(log)
                print(f"❌ ERROR: {log['message']}")
            elif 'warn' in log['message'].lower() and 'React Router' not in log['message']:
                print(f"⚠️  WARN: {log['message'][:200]}")

        # USER LOGS
        user_logs = get_console_logs(user_driver)
        print(f"\n👤 USER LOGS ({len(user_logs)} Einträge):")
        print("-" * 60)

        user_errors = []
        for log in user_logs:
            if log['level'] == 'SEVERE' or 'error' in log['message'].lower():
                user_errors.append(log)
                print(f"❌ ERROR: {log['message']}")
            elif 'warn' in log['message'].lower() and 'React Router' not in log['message']:
                print(f"⚠️  WARN: {log['message'][:200]}")

        # SCHRITT 7: Screenshots
        print("\n📸 Erstelle Screenshots...")
        host_driver.save_screenshot(f'/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/host-{test_name.replace(" ", "-")}.png')
        user_driver.save_screenshot(f'/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/user-{test_name.replace(" ", "-")}.png')
        print("✅ Screenshots gespeichert")

        # SCHRITT 8: Prüfe ob Seite leer ist
        print("\n🔍 Prüfe Seiten-Inhalt...")
        host_body = host_driver.find_element(By.TAG_NAME, 'body')
        host_text = host_body.text

        if len(host_text.strip()) < 50:
            print("❌ HOST SEITE IST LEER!")
            print(f"   Body Text: '{host_text[:100]}'")
        else:
            print(f"✅ Host Seite hat Inhalt ({len(host_text)} Zeichen)")
            # Prüfe ob Buzzer-Frage angezeigt wird
            if "Was ist die Hauptstadt von Deutschland?" in host_text:
                print("✅ Buzzer-Frage wird angezeigt!")
            else:
                print("⚠️  Buzzer-Frage nicht gefunden im Text")

        user_body = user_driver.find_element(By.TAG_NAME, 'body')
        user_text = user_body.text

        if len(user_text.strip()) < 50:
            print("❌ USER SEITE IST LEER!")
            print(f"   Body Text: '{user_text[:100]}'")
        else:
            print(f"✅ User Seite hat Inhalt ({len(user_text)} Zeichen)")

        # ZUSAMMENFASSUNG
        print("\n" + "="*60)
        print("📊 ZUSAMMENFASSUNG")
        print("="*60)
        print(f"Host Errors: {len(host_errors)}")
        print(f"User Errors: {len(user_errors)}")

        if host_errors:
            print("\n🔴 KRITISCHE HOST FEHLER:")
            for err in host_errors:
                print(f"  - {err['message'][:300]}")

        if user_errors:
            print("\n🔴 KRITISCHE USER FEHLER:")
            for err in user_errors:
                print(f"  - {err['message'][:300]}")

        # Speichere Logs in Datei
        with open(f'/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/logs-{test_name.replace(" ", "-")}.json', 'w') as f:
            json.dump({
                'host_logs': host_logs,
                'user_logs': user_logs,
                'host_errors': host_errors,
                'user_errors': user_errors
            }, f, indent=2)

        print(f"\n✅ Logs gespeichert in logs-{test_name.replace(' ', '-')}.json")

        # Halte Browser offen für 5 Sekunden
        print("\n⏰ Browser bleiben für 5 Sekunden offen...")
        time.sleep(5)

    except Exception as e:
        print(f"\n❌ FEHLER: {str(e)}")
        import traceback
        traceback.print_exc()

        # Speichere Error Screenshot
        try:
            host_driver.save_screenshot(f'/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/error-host-{test_name.replace(" ", "-")}.png')
            user_driver.save_screenshot(f'/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/error-user-{test_name.replace(" ", "-")}.png')
        except:
            pass

    finally:
        print("\n🧹 Schließe Browser...")
        host_driver.quit()
        user_driver.quit()

def main():
    """Hauptfunktion"""
    import os

    # Erstelle Screenshots Ordner
    os.makedirs('/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots', exist_ok=True)

    # Test 1: Lokal
    test_buzzer_question('http://localhost:5173/Quiz', 'LOCAL')

    # Test 2: Online
    print("\n\n")
    test_buzzer_question('http://if0-39705173.infinityfreeapp.com/Quiz', 'ONLINE')

    print("\n\n✅ ALLE TESTS ABGESCHLOSSEN!")

if __name__ == '__main__':
    main()
