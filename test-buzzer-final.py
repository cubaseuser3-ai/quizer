#!/usr/bin/env python3
"""
Finaler Buzzer Test - mit Hard Reload und Port 3000
"""
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time
import json
import sys

def test_buzzer():
    # Setup driver mit Console Logging und AGGRESSIVEN Cache-Optionen
    options = Options()
    options.add_argument('--incognito')  # Frische Browser-Session
    options.add_argument('--disable-cache')
    options.add_argument('--disable-application-cache')
    options.add_argument('--disk-cache-size=0')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--disable-gpu-shader-disk-cache')
    options.add_argument('--media-cache-size=0')
    options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

    driver = webdriver.Chrome(options=options)

    try:
        print("\n" + "="*70)
        print("🧪 FINAL BUZZER TEST")
        print("="*70 + "\n")

        # 1. Öffne Seite mit Hard Refresh
        print("📂 Öffne localhost:5173/Quiz...")
        driver.get('http://localhost:5173/Quiz/')
        time.sleep(1)

        # HARD REFRESH mit Ctrl+Shift+R
        print("🔄 Führe Hard Refresh durch...")
        driver.execute_script("location.reload(true);")
        time.sleep(2)

        # 2. Erstelle Quiz
        print("📝 Erstelle Buzzer-Quiz...")
        quiz_id = driver.execute_script("""
            const quiz = {
                id: 'final-test-' + Date.now(),
                title: 'FINAL BUZZER TEST',
                questions: [{
                    type: 'buzzer',
                    question: 'Was ist die Hauptstadt von Deutschland?',
                    points: 100,
                    timeLimit: 30
                }],
                createdAt: new Date().toISOString()
            };
            const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
            quizzes.push(quiz);
            localStorage.setItem('quizzes', JSON.stringify(quizzes));
            return quiz.id;
        """)
        print(f"✅ Quiz ID: {quiz_id}")

        # 3. Navigiere zur Host-Seite
        print("🎮 Navigiere zur Host-Seite...")
        driver.get(f'http://localhost:5173/Quiz/host/{quiz_id}')
        time.sleep(3)

        # 4. Prüfe Socket-Verbindung
        print("🔌 Prüfe Socket-Verbindung...")
        socket_check = driver.execute_script("""
            // Prüfe ob socket.io geladen wurde
            if (window.io) {
                return 'socket.io library loaded';
            }
            return 'socket.io NOT loaded';
        """)
        print(f"   {socket_check}")

        # 5. Klicke "Spiel starten"
        print("🚀 Klicke 'Spiel starten'...")
        start_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Spiel starten')]")
        start_btn.click()
        print("✅ Button geklickt")

        # 6. Warte auf Frage
        print("⏰ Warte 5 Sekunden auf Buzzer-Frage...")
        time.sleep(5)

        # 7. Screenshot
        screenshot_path = '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/FINAL-TEST.png'
        driver.save_screenshot(screenshot_path)
        print(f"📸 Screenshot: {screenshot_path}")

        # 8. Hole Console Logs
        logs = driver.get_log('browser')
        print(f"\n" + "="*70)
        print(f"📋 CONSOLE LOGS ({len(logs)} Einträge)")
        print("="*70 + "\n")

        errors = []
        for log in logs:
            if log['level'] == 'SEVERE':
                errors.append(log)
                print(f"❌ ERROR: {log['message'][:300]}")
            elif 'error' in log['message'].lower() and 'React Router' not in log['message']:
                print(f"⚠️  {log['message'][:200]}")

        # 9. Prüfe Seiten-Inhalt
        body = driver.find_element(By.TAG_NAME, 'body').text
        print(f"\n" + "="*70)
        print("🔍 SEITEN-ANALYSE")
        print("="*70 + "\n")

        print(f"Body Length: {len(body)} Zeichen")

        if "Was ist die Hauptstadt von Deutschland?" in body:
            print("✅ ERFOLG: Buzzer-Frage wird angezeigt!")
        else:
            print("❌ FEHLER: Buzzer-Frage NICHT gefunden")
            print(f"Body-Text (erste 500 Zeichen):\n{body[:500]}")

        # 10. Speichere Logs
        log_data = {
            'quiz_id': quiz_id,
            'logs_count': len(logs),
            'errors_count': len(errors),
            'body_length': len(body),
            'has_buzzer_question': "Was ist die Hauptstadt von Deutschland?" in body,
            'all_logs': logs,
            'errors': errors
        }

        with open('/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/FINAL-LOGS.json', 'w') as f:
            json.dump(log_data, f, indent=2)

        print(f"\n" + "="*70)
        print("📊 ZUSAMMENFASSUNG")
        print("="*70)
        print(f"Logs: {len(logs)}")
        print(f"Errors: {len(errors)}")
        print(f"Buzzer-Frage sichtbar: {'JA ✅' if log_data['has_buzzer_question'] else 'NEIN ❌'}")

        if errors:
            print(f"\n🔴 {len(errors)} KRITISCHE FEHLER:")
            for err in errors[:3]:
                print(f"  - {err['message'][:200]}")

        print(f"\n✅ Test abgeschlossen")
        print(f"📂 Logs: FINAL-LOGS.json")
        print(f"📸 Screenshot: FINAL-TEST.png\n")

        # Warte 10 Sekunden
        print("⏰ Browser bleibt 10 Sekunden offen...")
        time.sleep(10)

    except Exception as e:
        print(f"\n❌ FEHLER: {e}")
        import traceback
        traceback.print_exc()
        try:
            driver.save_screenshot('/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/ERROR-FINAL.png')
        except:
            pass
    finally:
        driver.quit()

if __name__ == '__main__':
    test_buzzer()
